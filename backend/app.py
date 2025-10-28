import asyncio
import json
import os
import uuid
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import re
from collections import deque

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Claude Workflow Manager")

# Add middleware to handle OPTIONS requests
@app.middleware("http")
async def handle_options(request: Request, call_next):
    if request.method == "OPTIONS":
        return JSONResponse(
            content={},
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true",
            }
        )
    response = await call_next(request)
    return response

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:80",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://many-virgie-jacquesikot-9433b132.koyeb.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory
BASE_DIR = Path(__file__).parent

# Directory paths
BRAND_DATA_DIR = BASE_DIR / "brand-data"
BRIEF_OUTPUTS_DIR = BASE_DIR / "brief-outputs"
DRAFT_OUTPUTS_DIR = BASE_DIR / "draft-outputs"
INSTRUCTIONS_DIR = BASE_DIR / "instructions"
LOGS_DIR = BASE_DIR / "logs"

# Ensure directories exist
for directory in [BRAND_DATA_DIR, BRIEF_OUTPUTS_DIR, DRAFT_OUTPUTS_DIR, INSTRUCTIONS_DIR, LOGS_DIR]:
    directory.mkdir(exist_ok=True)

# Job storage
jobs: Dict[str, dict] = {}
job_queue: deque = deque()  # Queue for jobs waiting to be executed
MAX_CONCURRENT_JOBS = int(os.getenv("MAX_CONCURRENT_JOBS", "5"))


# Pydantic models
class BrandDataGenerateRequest(BaseModel):
    brand_name: str
    urls: List[str]


class BriefGenerateRequest(BaseModel):
    title: str
    primary_keyword: str
    secondary_keywords: str
    brand_data: str


class DraftGenerateRequest(BaseModel):
    brief_filename: str
    brand_data_filename: str


class BriefBatchGenerateRequest(BaseModel):
    briefs: List[BriefGenerateRequest]


class DraftBatchGenerateRequest(BaseModel):
    drafts: List[DraftGenerateRequest]


class BatchJobResponse(BaseModel):
    batch_id: str
    job_ids: List[str]
    total_jobs: int
    message: str


class FileResponse(BaseModel):
    name: str
    size: int
    created_at: float
    preview: Optional[str] = None


class JobResponse(BaseModel):
    job_id: str
    type: str
    status: str
    created_at: str
    params: dict
    output_files: Optional[List[str]] = None


class BrandDataSaveRequest(BaseModel):
    filename: str
    content: dict


class BriefSaveRequest(BaseModel):
    filename: str
    content: str


class DraftSaveRequest(BaseModel):
    filename: str
    content: str


# File Manager
class FileManager:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir

    def list_files(self, folder: str, extension: str) -> List[FileResponse]:
        files = []
        folder_path = self.base_dir / folder
        if not folder_path.exists():
            return files

        for file in folder_path.glob(f"*.{extension}"):
            try:
                stat = file.stat()
                preview = self.get_preview(file)
                files.append(FileResponse(
                    name=file.name,
                    size=stat.st_size,
                    created_at=stat.st_mtime,
                    preview=preview
                ))
            except Exception as e:
                print(f"Error reading file {file}: {e}")
                continue

        # Sort by creation time, newest first
        files.sort(key=lambda x: x.created_at, reverse=True)
        return files

    def get_preview(self, file: Path, chars: int = 200) -> str:
        try:
            if file.suffix == ".json":
                data = json.loads(file.read_text())
                if "brandInfo" in data and isinstance(data["brandInfo"], dict):
                    brand_desc = data["brandInfo"].get("brandDescription", {})
                    if isinstance(brand_desc, dict):
                        return brand_desc.get("value", "")[:chars]
                return str(data)[:chars]
            elif file.suffix == ".md":
                content = file.read_text()
                # Remove markdown syntax for preview
                preview = re.sub(r'[#*`\[\]()]', '', content)
                return preview[:chars]
        except Exception as e:
            print(f"Error getting preview for {file}: {e}")
            return ""
        return ""

    def read_file(self, folder: str, filename: str) -> str:
        file_path = self.base_dir / folder / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        return file_path.read_text()

    def delete_file(self, folder: str, filename: str) -> bool:
        file_path = self.base_dir / folder / filename
        if file_path.exists():
            file_path.unlink()
            return True
        return False

    async def save_upload(self, folder: str, file: UploadFile) -> str:
        file_path = self.base_dir / folder / file.filename
        content = await file.read()
        file_path.write_bytes(content)
        return file.filename

    def save_file(self, folder: str, filename: str, content: str) -> bool:
        """Save content to a file"""
        file_path = self.base_dir / folder / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        try:
            file_path.write_text(content, encoding='utf-8')
            return True
        except Exception as e:
            print(f"Error saving file {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


# Job Manager
class JobManager:
    def __init__(self):
        self.jobs = jobs
        self.queue = job_queue

    def active_count(self) -> int:
        return sum(1 for job in self.jobs.values() if job["status"] == "running")

    def queued_count(self) -> int:
        return sum(1 for job in self.jobs.values() if job["status"] == "queued")

    async def start_job(self, job_type: str, params: dict, batch_id: Optional[str] = None) -> str:
        """Create a job and either start it immediately or add to queue"""
        job_id = str(uuid.uuid4())[:8]

        # Create log file
        log_file = LOGS_DIR / f"{job_id}.log"

        # Determine initial status based on active jobs
        if self.active_count() >= MAX_CONCURRENT_JOBS:
            status = "queued"
        else:
            status = "running"

        self.jobs[job_id] = {
            "id": job_id,
            "type": job_type,
            "status": status,
            "created_at": datetime.now().isoformat(),
            "params": params,
            "process": None,
            "log_file": str(log_file),
            "output_files": [],
            "batch_id": batch_id,
            "queue_position": None
        }

        if status == "queued":
            # Add to queue
            self.queue.append(job_id)
            self.jobs[job_id]["queue_position"] = len(self.queue)
            print(f"[Job {job_id}] Added to queue (position: {len(self.queue)})", flush=True)
        else:
            # Start immediately
            asyncio.create_task(self.execute_job(job_id, job_type, params, log_file))

        return job_id

    async def process_queue(self):
        """Process queued jobs when slots become available"""
        while self.queue and self.active_count() < MAX_CONCURRENT_JOBS:
            job_id = self.queue.popleft()

            if job_id not in self.jobs:
                continue

            job = self.jobs[job_id]

            # Update status and start job
            job["status"] = "running"
            job["queue_position"] = None

            print(f"[Job {job_id}] Starting from queue", flush=True)

            asyncio.create_task(
                self.execute_job(
                    job_id,
                    job["type"],
                    job["params"],
                    Path(job["log_file"])
                )
            )

        # Update queue positions for remaining jobs
        for idx, job_id in enumerate(self.queue, start=1):
            if job_id in self.jobs:
                self.jobs[job_id]["queue_position"] = idx

    async def execute_job(self, job_id: str, job_type: str, params: dict, log_file: Path):
        """Execute Claude Code command and capture output"""
        try:
            # Build the prompt based on job type
            if job_type == "brand_data":
                prompt = self.build_brand_data_prompt(params)
            elif job_type == "brief":
                prompt = self.build_brief_prompt(params)
            elif job_type == "draft":
                prompt = self.build_draft_prompt(params)
            else:
                raise ValueError(f"Unknown job type: {job_type}")

            # Write initial log entry
            with open(log_file, "w") as f:
                timestamp = datetime.now().strftime("%H:%M:%S")
                f.write(f"{timestamp} | Starting job type: {job_type}\n")
                f.write(f"{timestamp} | Working directory: {BASE_DIR.parent}\n")
                f.write(f"{timestamp} | Executing Claude Code...\n")
                f.flush()

            # Also print to console for local debugging
            print(f"\n[Job {job_id}] Starting {job_type} job", flush=True)
            print(f"[Job {job_id}] Log file: {log_file}", flush=True)
            print(f"[Job {job_id}] Working directory: {BASE_DIR.parent}\n", flush=True)

            # Run with stream-json format for real-time output
            process = await asyncio.create_subprocess_exec(
                "claude",
                "--print",
                "--verbose",
                "--dangerously-skip-permissions",
                "--output-format",
                "stream-json",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(BASE_DIR.parent)
            )

            # Write prompt and close stdin
            if process.stdin:
                process.stdin.write(prompt.encode())
                await process.stdin.drain()
                process.stdin.close()

            self.jobs[job_id]["process"] = process

            # Track tool use IDs to match results with calls
            tool_use_map = {}  # tool_use_id -> tool_name

            # Read JSON stream line by line
            with open(log_file, "a", buffering=1) as f:
                if process.stdout:
                    async for line in process.stdout:
                        try:
                            data = json.loads(line.decode())
                            event_type = data.get('type', 'unknown')
                            timestamp = datetime.now().strftime("%H:%M:%S")

                            # Log different event types
                            if event_type == 'system' and data.get('subtype') == 'init':
                                log_entry = f"{timestamp} | Session initialized: {data.get('session_id', 'N/A')}\n"
                                f.write(log_entry)
                                f.flush()
                                print(f"[Job {job_id}] Session initialized", flush=True)

                            elif event_type == 'assistant':
                                message = data.get('message', {})
                                content = message.get('content', [])
                                for item in content:
                                    if item.get('type') == 'text':
                                        text = item.get('text', '')
                                        # Write the actual response text
                                        log_entry = f"{timestamp} | {text}\n"
                                        f.write(log_entry)
                                        f.flush()
                                        print(f"[Job {job_id}] Response: {text[:100]}...", flush=True)

                                    elif item.get('type') == 'tool_use':
                                        # Tool call is embedded in assistant message
                                        tool_name = item.get('name', 'unknown')
                                        tool_use_id = item.get('id')
                                        tool_input = item.get('input', {})

                                        # Store mapping for later result matching
                                        if tool_use_id:
                                            tool_use_map[tool_use_id] = tool_name

                                        # Format tool input for logging
                                        input_str = ""
                                        if isinstance(tool_input, dict):
                                            # Show key parameters
                                            if 'command' in tool_input:
                                                input_str = f" → {tool_input['command'][:100]}"
                                            elif 'file_path' in tool_input:
                                                input_str = f" → {tool_input['file_path']}"
                                            elif 'pattern' in tool_input:
                                                input_str = f" → pattern: {tool_input['pattern']}"
                                            elif 'url' in tool_input:
                                                input_str = f" → {tool_input['url']}"
                                            elif 'query' in tool_input:
                                                input_str = f" → query: {tool_input['query'][:80]}"
                                            elif 'prompt' in tool_input:
                                                input_str = f" → prompt: {tool_input['prompt'][:80]}"

                                        log_entry = f"{timestamp} | 🔧 Tool: {tool_name}{input_str}\n"
                                        f.write(log_entry)
                                        f.flush()
                                        print(f"[Job {job_id}] 🔧 Tool: {tool_name}{input_str}", flush=True)

                            elif event_type == 'user':
                                # Tool results come in user messages
                                message = data.get('message', {})
                                content = message.get('content', [])
                                for item in content:
                                    if item.get('type') == 'tool_result':
                                        tool_use_id = item.get('tool_use_id')
                                        tool_name = tool_use_map.get(tool_use_id, 'unknown')
                                        is_error = item.get('is_error', False)
                                        result_content = item.get('content', '')

                                        # Get a preview of the result
                                        result_preview = ""
                                        if isinstance(result_content, str):
                                            clean_content = result_content.strip()
                                            if len(clean_content) > 150:
                                                result_preview = f" → {clean_content[:150]}..."
                                            elif clean_content:
                                                result_preview = f" → {clean_content}"
                                        elif isinstance(result_content, list) and result_content:
                                            result_preview = f" → {len(result_content)} items"

                                        status_icon = "✗" if is_error else "✓"
                                        status_str = 'error' if is_error else 'success'
                                        log_entry = f"{timestamp} |   {status_icon} {tool_name}: {status_str}{result_preview}\n"
                                        f.write(log_entry)
                                        f.flush()
                                        print(f"[Job {job_id}]   {status_icon} {tool_name}: {status_str}", flush=True)

                            elif event_type == 'result':
                                status = 'success' if not data.get('is_error') else 'error'
                                duration = data.get('duration_ms', 0) / 1000
                                log_entry = f"{timestamp} | Task {status} (took {duration:.1f}s)\n"
                                f.write(log_entry)
                                f.flush()
                                print(f"[Job {job_id}] Task {status}", flush=True)

                        except json.JSONDecodeError:
                            # Skip invalid JSON lines
                            pass
                        except Exception as e:
                            print(f"[Job {job_id}] Error processing line: {e}", flush=True)

            # Wait for process to complete
            await process.wait()

            # Update job status
            with open(log_file, "a") as f:
                timestamp = datetime.now().strftime("%H:%M:%S")
                f.write(f"{timestamp} | Process completed with return code: {process.returncode}\n")
                f.flush()

            if process.returncode == 0:
                self.jobs[job_id]["status"] = "completed"
                # Find output files
                output_files = self.find_output_files(job_type, params)
                self.jobs[job_id]["output_files"] = output_files
                print(f"\n[Job {job_id}] ✓ Completed successfully", flush=True)
                print(f"[Job {job_id}] Output files: {output_files}\n", flush=True)
            else:
                self.jobs[job_id]["status"] = "failed"
                print(f"\n[Job {job_id}] ✗ Failed with return code: {process.returncode}\n", flush=True)

        except Exception as e:
            self.jobs[job_id]["status"] = "failed"
            with open(log_file, "a") as f:
                timestamp = datetime.now().strftime("%H:%M:%S")
                f.write(f"{timestamp} | Exception: {str(e)}\n")
                f.write(f"{timestamp} | Traceback: {traceback.format_exc()}\n")
            print(f"\n[Job {job_id}] ✗ Exception: {str(e)}\n", flush=True)

        finally:
            # Process queue to start next jobs
            await self.process_queue()

    def _run_claude_with_pty(self, job_id: str, prompt: str, log_file: Path):
        """Run Claude with PTY for unbuffered output - runs in thread pool"""
        import subprocess
        import fcntl
        import time

        try:
            # Create a pseudo-terminal
            master_fd, slave_fd = pty.openpty()

            # Start Claude process with PTY
            env = os.environ.copy()
            env['PYTHONUNBUFFERED'] = '1'

            process = subprocess.Popen(
                ["claude", "--print", "--dangerously-skip-permissions"],
                stdin=subprocess.PIPE,
                stdout=slave_fd,
                stderr=slave_fd,
                cwd=str(BASE_DIR.parent),
                env=env,
                preexec_fn=os.setsid  # Create new session
            )

            # Store process in jobs
            self.jobs[job_id]["process"] = process

            # Close slave fd in parent process
            os.close(slave_fd)

            # Write prompt to stdin and close it
            if process.stdin:
                process.stdin.write(prompt.encode())
                process.stdin.flush()
                process.stdin.close()

            # Set master_fd to non-blocking mode
            flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
            fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            # Read output from master_fd in real-time
            buffer = ""
            with open(log_file, "a", buffering=1) as f:
                while True:
                    # Use select to wait for data with timeout
                    ready, _, _ = select.select([master_fd], [], [], 0.1)

                    if ready:
                        try:
                            chunk = os.read(master_fd, 1024)
                            if not chunk:  # EOF
                                break

                            # Decode chunk
                            try:
                                decoded = chunk.decode('utf-8')
                            except UnicodeDecodeError:
                                decoded = chunk.decode('utf-8', errors='ignore')

                            buffer += decoded

                            # Process complete lines
                            while '\n' in buffer:
                                line, buffer = buffer.split('\n', 1)
                                # Remove ANSI color codes and control characters
                                clean_line = re.sub(r'\x1b\[[0-9;]*[mGKHF]', '', line)
                                if clean_line.strip():
                                    timestamp = datetime.now().strftime("%H:%M:%S")
                                    log_entry = f"{timestamp} | {clean_line}\n"
                                    f.write(log_entry)
                                    f.flush()
                                    print(f"[Job {job_id}] {clean_line}", flush=True)

                        except OSError as e:
                            if e.errno == 5:  # Input/output error - process ended
                                break
                            raise

                    # Check if process has finished
                    if process.poll() is not None:
                        # Read any remaining data
                        time.sleep(0.1)
                        try:
                            chunk = os.read(master_fd, 4096)
                            if chunk:
                                decoded = chunk.decode('utf-8', errors='ignore')
                                buffer += decoded
                        except:
                            pass
                        break

                # Write any remaining buffer
                if buffer.strip():
                    clean_buffer = re.sub(r'\x1b\[[0-9;]*[mGKHF]', '', buffer)
                    if clean_buffer.strip():
                        timestamp = datetime.now().strftime("%H:%M:%S")
                        log_entry = f"{timestamp} | {clean_buffer}\n"
                        f.write(log_entry)
                        f.flush()
                        print(f"[Job {job_id}] {clean_buffer}", flush=True)

            # Close master_fd
            os.close(master_fd)

            # Wait for process to complete
            returncode = process.wait()

            # Update job status
            with open(log_file, "a") as f:
                timestamp = datetime.now().strftime("%H:%M:%S")
                f.write(f"{timestamp} | Process completed with return code: {returncode}\n")
                f.flush()

            if returncode == 0:
                self.jobs[job_id]["status"] = "completed"
                # Find output files
                output_files = self.find_output_files(
                    self.jobs[job_id]["type"],
                    self.jobs[job_id]["params"]
                )
                self.jobs[job_id]["output_files"] = output_files
                print(f"\n[Job {job_id}] ✓ Completed successfully", flush=True)
                print(f"[Job {job_id}] Output files: {output_files}\n", flush=True)
            else:
                self.jobs[job_id]["status"] = "failed"
                print(f"\n[Job {job_id}] ✗ Failed with return code: {returncode}\n", flush=True)

        except Exception as e:
            self.jobs[job_id]["status"] = "failed"
            print(f"[Job {job_id}] PTY Exception: {str(e)}", flush=True)
            traceback.print_exc()
            with open(log_file, "a") as f:
                timestamp = datetime.now().strftime("%H:%M:%S")
                f.write(f"{timestamp} | PTY Exception: {str(e)}\n")
                f.write(f"{timestamp} | Traceback: {traceback.format_exc()}\n")

    def build_brand_data_prompt(self, params: dict) -> str:
        """Build prompt for brand data generation"""
        brand_name = params["brand_name"]
        urls = params["urls"]

        # Sanitize brand name for filename
        safe_brand_name = re.sub(r'[^\w\s-]', '', brand_name.lower())
        safe_brand_name = re.sub(r'[-\s]+', '_', safe_brand_name)
        output_file = f"backend/brand-data/{safe_brand_name}_brand_data.json"

        # Format URLs for the prompt
        urls_list = "\n".join([f"- {url}" for url in urls])

        prompt = f"""I need you to conduct thorough research on the brand "{brand_name}" using the following URLs:

        {urls_list}

        These URLs represent different parts of the same brand (e.g., main website, blog, store, help center, etc.). Your task is to generate ONE comprehensive brand data file in JSON format that consolidates information from ALL provided URLs.

        The output JSON file must match the EXACT structure of the file at data/your_data.json (which is the Indie Campers example).

        The output JSON file must include ALL of the following sections with comprehensive, well-researched data:

        1. **targetAudience**: Target customer segments, customer personas, target markets, target audience description, proof points

        2. **writingGuidelines**: Guidelines, tone of voice, author persona, example phrases, inspiration articles, vocabulary preferences

        **Research Instructions:**
        - Use the WebSearch tool to gather up-to-date information about {brand_name}
        - Visit ALL provided URLs to gather comprehensive information from each source
        - Research the company's competitors and industry positioning
        - Look for customer reviews on Trustpilot, G2, Capterra, or similar platforms
        - Find information about funding, team size, and company milestones
        - Identify their technology stack using available tools/sources
        - Research their target audience and customer personas
        - Analyze their content strategy from their blog and marketing materials
        - Identify their unique selling propositions and competitive advantages
        - Find example content to understand their tone of voice and writing style
        - If the brand has multiple domains (main site, blog, store), list them in the companySubdomains field

        **Output Requirements:**
        1. Create a SINGLE JSON file for {brand_name} at: {output_file}
        2. Follow the EXACT structure from data/your_data.json - every field must be present
        3. All data should be well-researched and accurate (not placeholder data)
        4. Consolidate information from all provided URLs into one comprehensive brand profile
        5. For any data you cannot find after thorough research, make intelligent inferences based on industry standards and similar companies
        6. Ensure all JSON is properly formatted and valid
        7. Include the 'locked: false' field for every section (matching the Indie Campers format)

        When you're done, confirm the file has been created but do not provide a summary of the research findings."""

        return prompt

    def build_brief_prompt(self, params: dict) -> str:
        """Build prompt for brief generation"""
        # Sanitize filename
        filename = re.sub(r'[^\w\s-]', '', params["title"].lower())
        filename = re.sub(r'[-\s]+', '_', filename)
        output_file = f"backend/brief-outputs/{filename}_brief.md"

        prompt = f"""Generate a content brief in the backend/brief-outputs/ folder.

        **Input Information:**
        - Title: {params["title"]}
        - Primary Keyword: {params["primary_keyword"]}
        - Secondary Keywords: {params["secondary_keywords"]}
        - Brand Data File: backend/brand-data/{params["brand_data"]}
        - Today's Date: {datetime.now().strftime("%Y-%m-%d")}

        **Instructions:**
        Follow the instructions in @backend/instructions/brief_generation_instructions.md to create a final brief in markdown that meets all the requirements.
        Use the example brief from @backend/instructions/brief_example.md to understand the structure and format of the brief.
        Use the brand data from @backend/brand-data/{params["brand_data"]} to ensure the brief matches the brand voice and positioning.

        Use the WebSearch tool in your research to get the most up-to-date information.

        **Output:**
        Create the brief as a markdown file at: {output_file}

        The brief should be 2000-2500 words maximum and follow the exact structure specified in the instructions and the example brief."""

        return prompt

    def build_draft_prompt(self, params: dict) -> str:
        """Build prompt for draft generation"""
        # Extract title from brief filename for output naming
        brief_name = params["brief_filename"].replace("_brief.md", "")
        output_file = f"backend/draft-outputs/{brief_name}_draft.md"

        prompt = f"""Generate a content draft in the backend/draft-outputs/ folder.

        **Input Information:**
        - Brief File: backend/brief-outputs/{params["brief_filename"]}
        - Brand Data File: backend/brand-data/{params["brand_data_filename"]}
        - Today's Date: {datetime.now().strftime("%Y-%m-%d")}

        **Instructions:**
        Follow the instructions in @backend/instructions/draft_generation_instructions.md to create a final draft in markdown that meets all the requirements.

        Use the content brief from @backend/brief-outputs/{params["brief_filename"]} as the brief_content.
        Use the brand data from @backend/brand-data/{params["brand_data_filename"]} to ensure the draft matches the brand voice.
        Use the example draft from @backend/instructions/draft_example.md to understand the structure and format of the draft.

        Use the WebSearch tool in your research to get the most up-to-date information and verify facts.

        **Output:**
        Create the production ready draft as a markdown file at: {output_file}

        The draft should be 2000 words maximum and follow the exact structure specified in the instructions and the example draft.

        Do not add any additional text or comments to the draft.
        Do not add any claude code watermark or signature to the draft.

        **Word Count Check:**
        After generating the draft, check if the word count exceeds 2000 words. If it does, automatically revise it to reduce it to 2000 words MAX while maintaining all critical information, SEO value, and brand voice."""

        return prompt

    def find_output_files(self, job_type: str, params: dict) -> List[str]:
        """Find output files created by the job"""
        output_files = []

        if job_type == "brand_data":
            # Sanitize brand name for filename
            brand_name = params.get("brand_name", "")
            safe_brand_name = re.sub(r'[^\w\s-]', '', brand_name.lower())
            safe_brand_name = re.sub(r'[-\s]+', '_', safe_brand_name)
            filename = f"{safe_brand_name}_brand_data.json"
            if (BRAND_DATA_DIR / filename).exists():
                output_files.append(filename)

        elif job_type == "brief":
            filename = re.sub(r'[^\w\s-]', '', params["title"].lower())
            filename = re.sub(r'[-\s]+', '_', filename)
            filename = f"{filename}_brief.md"
            if (BRIEF_OUTPUTS_DIR / filename).exists():
                output_files.append(filename)

        elif job_type == "draft":
            brief_name = params["brief_filename"].replace("_brief.md", "")
            filename = f"{brief_name}_draft.md"
            if (DRAFT_OUTPUTS_DIR / filename).exists():
                output_files.append(filename)

        return output_files

    def get_job(self, job_id: str) -> Optional[dict]:
        return self.jobs.get(job_id)

    def list_jobs(self, status: Optional[str] = None) -> List[dict]:
        """List jobs, excluding process objects for JSON serialization"""
        jobs_list = []
        for job in self.jobs.values():
            if status and job["status"] != status:
                continue

            # Create serializable job dict without process object
            job_dict = {
                "id": job["id"],
                "type": job["type"],
                "status": job["status"],
                "created_at": job["created_at"],
                "params": job["params"],
                "log_file": job["log_file"],
                "output_files": job.get("output_files", []),
                "batch_id": job.get("batch_id"),
                "queue_position": job.get("queue_position")
            }
            jobs_list.append(job_dict)

        return jobs_list


# Initialize managers
file_manager = FileManager(BASE_DIR)
job_manager = JobManager()


# API Endpoints

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Claude Workflow Manager API", "version": "1.0"}


# Health check endpoint for Coolify/monitoring
@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration (Coolify, Docker, K8s)"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_jobs": job_manager.active_count(),
        "max_concurrent_jobs": MAX_CONCURRENT_JOBS,
        "version": "1.0"
    }


# Brand Data Endpoints
@app.get("/api/brand-data")
async def list_brand_data():
    files = file_manager.list_files("brand-data", "json")
    return {"files": [f.dict() for f in files]}


@app.get("/api/brand-data/{filename}")
async def get_brand_data(filename: str):
    try:
        content = file_manager.read_file("brand-data", filename)
        return json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON file")


@app.post("/api/brand-data/upload")
async def upload_brand_data(file: UploadFile = File(...)):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON files are allowed")

    try:
        content = await file.read()
        json.loads(content)  # Validate JSON
        await file.seek(0)  # Reset file pointer
        filename = await file_manager.save_upload("brand-data", file)
        return {"success": True, "filename": filename}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")


@app.put("/api/brand-data/save")
async def save_brand_data(request: BrandDataSaveRequest):
    """Save edited brand data"""
    if not request.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Filename must end with .json")

    try:
        # Validate JSON content
        content_str = json.dumps(request.content, indent=2, ensure_ascii=False)
        file_manager.save_file("brand-data", request.filename, content_str)
        return {"success": True, "message": "Brand data saved successfully"}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON content")


@app.delete("/api/brand-data/{filename}")
async def delete_brand_data(filename: str):
    success = file_manager.delete_file("brand-data", filename)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"success": True}


@app.post("/api/brand-data/generate")
async def generate_brand_data(request: BrandDataGenerateRequest):
    if not request.brand_name:
        raise HTTPException(status_code=400, detail="Brand name is required")
    if not request.urls:
        raise HTTPException(status_code=400, detail="At least one URL is required")

    job_id = await job_manager.start_job("brand_data", {
        "brand_name": request.brand_name,
        "urls": request.urls
    })
    return {"job_id": job_id}


# Brief Endpoints
@app.get("/api/briefs")
async def list_briefs():
    files = file_manager.list_files("brief-outputs", "md")
    # Extract title from first H1 header for each file
    for file in files:
        try:
            content = file_manager.read_file("brief-outputs", file.name)
            # Extract title from content (first H1 or filename)
            match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            title = match.group(1) if match else file.name.replace("_", " ").replace(".md", "")
            file.preview = title
            # Count words
            word_count = len(content.split())
            file.size = word_count  # Store word count in size field for display
        except Exception as e:
            print(f"Error processing brief {file.name}: {e}")

    return {"files": [f.dict() for f in files]}


@app.get("/api/briefs/{filename}")
async def get_brief(filename: str):
    content = file_manager.read_file("brief-outputs", filename)
    return {"content": content}


@app.post("/api/briefs/upload")
async def upload_brief(file: UploadFile = File(...)):
    if not file.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="Only Markdown files are allowed")

    filename = await file_manager.save_upload("brief-outputs", file)
    return {"success": True, "filename": filename}


@app.put("/api/briefs/save")
async def save_brief(request: BriefSaveRequest):
    """Save edited brief"""
    if not request.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="Filename must end with .md")

    file_manager.save_file("brief-outputs", request.filename, request.content)
    return {"success": True, "message": "Brief saved successfully"}


@app.delete("/api/briefs/{filename}")
async def delete_brief(filename: str):
    success = file_manager.delete_file("brief-outputs", filename)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"success": True}


@app.post("/api/briefs/generate")
async def generate_brief(request: BriefGenerateRequest):
    if not request.title or not request.primary_keyword or not request.brand_data:
        raise HTTPException(status_code=400, detail="All fields are required")

    # Check if brand data file exists
    brand_data_path = BRAND_DATA_DIR / request.brand_data
    if not brand_data_path.exists():
        raise HTTPException(status_code=404, detail="Brand data file not found")

    job_id = await job_manager.start_job("brief", {
        "title": request.title,
        "primary_keyword": request.primary_keyword,
        "secondary_keywords": request.secondary_keywords,
        "brand_data": request.brand_data
    })
    return {"job_id": job_id}


@app.post("/api/briefs/generate/batch")
async def generate_briefs_batch(request: BriefBatchGenerateRequest):
    """Generate multiple briefs at once"""
    if not request.briefs or len(request.briefs) == 0:
        raise HTTPException(status_code=400, detail="At least one brief is required")

    if len(request.briefs) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 briefs per batch")

    batch_id = str(uuid.uuid4())[:8]

    # Validate all briefs first
    for brief_request in request.briefs:
        if not brief_request.title or not brief_request.primary_keyword or not brief_request.brand_data:
            raise HTTPException(status_code=400, detail=f"Brief '{brief_request.title}' has missing required fields")

        brand_data_path = BRAND_DATA_DIR / brief_request.brand_data
        if not brand_data_path.exists():
            raise HTTPException(status_code=404, detail=f"Brand data file not found: {brief_request.brand_data}")

    # Create all jobs concurrently using asyncio.gather
    job_tasks = [
        job_manager.start_job("brief", {
            "title": brief_request.title,
            "primary_keyword": brief_request.primary_keyword,
            "secondary_keywords": brief_request.secondary_keywords,
            "brand_data": brief_request.brand_data
        }, batch_id=batch_id)
        for brief_request in request.briefs
    ]

    job_ids = await asyncio.gather(*job_tasks)

    return BatchJobResponse(
        batch_id=batch_id,
        job_ids=job_ids,
        total_jobs=len(job_ids),
        message=f"Batch of {len(job_ids)} brief(s) submitted successfully"
    )


# Draft Endpoints
@app.get("/api/drafts")
async def list_drafts():
    files = file_manager.list_files("draft-outputs", "md")
    # Extract metadata
    for file in files:
        try:
            content = file_manager.read_file("draft-outputs", file.name)
            # Extract title
            match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            title = match.group(1) if match else file.name.replace("_", " ").replace(".md", "")
            file.preview = title
            # Count words
            word_count = len(content.split())
            file.size = word_count
        except Exception as e:
            print(f"Error processing draft {file.name}: {e}")

    return {"files": [f.dict() for f in files]}


@app.get("/api/drafts/{filename}")
async def get_draft(filename: str):
    content = file_manager.read_file("draft-outputs", filename)
    return {"content": content}


@app.post("/api/drafts/upload")
async def upload_draft(file: UploadFile = File(...)):
    if not file.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="Only Markdown files are allowed")

    filename = await file_manager.save_upload("draft-outputs", file)
    return {"success": True, "filename": filename}


@app.put("/api/drafts/save")
async def save_draft(request: DraftSaveRequest):
    """Save edited draft"""
    if not request.filename.endswith(".md"):
        raise HTTPException(status_code=400, detail="Filename must end with .md")

    file_manager.save_file("draft-outputs", request.filename, request.content)
    return {"success": True, "message": "Draft saved successfully"}


@app.delete("/api/drafts/{filename}")
async def delete_draft(filename: str):
    success = file_manager.delete_file("draft-outputs", filename)
    if not success:
        raise HTTPException(status_code=404, detail="File not found")
    return {"success": True}


@app.post("/api/drafts/generate")
async def generate_draft(request: DraftGenerateRequest):
    if not request.brief_filename or not request.brand_data_filename:
        raise HTTPException(status_code=400, detail="Both brief and brand data are required")

    # Check if files exist
    brief_path = BRIEF_OUTPUTS_DIR / request.brief_filename
    brand_data_path = BRAND_DATA_DIR / request.brand_data_filename

    if not brief_path.exists():
        raise HTTPException(status_code=404, detail="Brief file not found")
    if not brand_data_path.exists():
        raise HTTPException(status_code=404, detail="Brand data file not found")

    job_id = await job_manager.start_job("draft", {
        "brief_filename": request.brief_filename,
        "brand_data_filename": request.brand_data_filename
    })
    return {"job_id": job_id}


@app.post("/api/drafts/generate/batch")
async def generate_drafts_batch(request: DraftBatchGenerateRequest):
    """Generate multiple drafts at once"""
    if not request.drafts or len(request.drafts) == 0:
        raise HTTPException(status_code=400, detail="At least one draft is required")

    if len(request.drafts) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 drafts per batch")

    batch_id = str(uuid.uuid4())[:8]

    # Validate all drafts first
    for draft_request in request.drafts:
        if not draft_request.brief_filename or not draft_request.brand_data_filename:
            raise HTTPException(status_code=400, detail=f"Draft with brief '{draft_request.brief_filename}' has missing required fields")

        # Check if files exist
        brief_path = BRIEF_OUTPUTS_DIR / draft_request.brief_filename
        brand_data_path = BRAND_DATA_DIR / draft_request.brand_data_filename

        if not brief_path.exists():
            raise HTTPException(status_code=404, detail=f"Brief file not found: {draft_request.brief_filename}")
        if not brand_data_path.exists():
            raise HTTPException(status_code=404, detail=f"Brand data file not found: {draft_request.brand_data_filename}")

    # Create all jobs concurrently using asyncio.gather
    job_tasks = [
        job_manager.start_job("draft", {
            "brief_filename": draft_request.brief_filename,
            "brand_data_filename": draft_request.brand_data_filename
        }, batch_id=batch_id)
        for draft_request in request.drafts
    ]

    job_ids = await asyncio.gather(*job_tasks)

    return BatchJobResponse(
        batch_id=batch_id,
        job_ids=job_ids,
        total_jobs=len(job_ids),
        message=f"Batch of {len(job_ids)} draft(s) submitted successfully"
    )


# Job Endpoints
@app.get("/api/jobs")
async def list_jobs(status: Optional[str] = None):
    jobs_list = job_manager.list_jobs(status)
    return {"jobs": jobs_list}


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Create a serializable copy without the process object
    job_response = {
        "id": job["id"],
        "type": job["type"],
        "status": job["status"],
        "created_at": job["created_at"],
        "params": job["params"],
        "log_file": job["log_file"],
        "output_files": job.get("output_files", []),
        "batch_id": job.get("batch_id"),
        "queue_position": job.get("queue_position")
    }
    return job_response


@app.get("/api/jobs/{job_id}/logs")
async def stream_logs(job_id: str):
    """Stream job logs using Server-Sent Events"""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    log_file = Path(job["log_file"])

    async def event_generator():
        # If log file doesn't exist yet, wait for it
        for _ in range(10):
            if log_file.exists():
                break
            await asyncio.sleep(0.5)

        if not log_file.exists():
            yield {
                "event": "error",
                "data": json.dumps({"message": "Log file not found"})
            }
            return

        # Read existing logs
        with open(log_file, "r") as f:
            for line in f:
                yield {
                    "event": "log",
                    "data": json.dumps({"message": line.strip()})
                }

        # Stream new logs
        last_size = log_file.stat().st_size
        while job["status"] == "running":
            await asyncio.sleep(0.5)
            current_size = log_file.stat().st_size

            if current_size > last_size:
                with open(log_file, "r") as f:
                    f.seek(last_size)
                    for line in f:
                        yield {
                            "event": "log",
                            "data": json.dumps({"message": line.strip()})
                        }
                last_size = current_size

        # Send completion event
        yield {
            "event": "complete",
            "data": json.dumps({
                "job_id": job_id,
                "status": job["status"],
                "output_files": job.get("output_files", [])
            })
        }

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",  # Import string format required for reload
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["./"],
        log_level="info"
    )
