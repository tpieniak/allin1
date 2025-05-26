# Browser-Based Virtual Environment

## Description

This project implements a command-line interface (CLI) terminal that runs entirely within a web browser. It features a virtual file system and the ability to execute Python code, providing a sandboxed environment for simple shell operations and Python scripting.

## Features

*   **Terminal Interface:** Powered by Xterm.js, offering a familiar terminal experience.
*   **Virtual File System:** Utilizes ZenFS for an in-browser file system. By default, this is an in-memory system.
*   **Python Execution:** Leverages Pyodide to run Python code directly in the browser (via WebAssembly).
*   **Implemented Commands:**
    *   `ls [path]`: Lists files and directories at the given path or current directory.
    *   `cd <path>`: Changes the current directory.
    *   `mkdir <directory_name>`: Creates a new directory.
    *   `cat <file_name>`: Displays the content of a file.
    *   `echo "text" > <file_name>`: Writes text to a file, overwriting if the file exists.
    *   `rm <path>`: Removes a file or a directory (recursively deletes directory contents).
    *   `cp <source_path> <destination_path>`: Copies a file. If the destination is a directory, the file is copied into it.
    *   `python <script_path.py>`: Executes a Python script from the virtual file system.
    *   `python -c "<code>"`: Executes a Python code string directly.
    *   `clear`: Clears the terminal display.

## Setup and Usage

1.  Clone or download the project files.
2.  Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox, Edge, Safari).

No build steps or local server are required for the basic setup to function. All necessary libraries are loaded via CDN.

## Python Environment

Python code execution is handled by Pyodide, which compiles and runs Python in WebAssembly. This allows for near-native Python performance in the browser.

Python scripts can interact with the ZenFS virtual file system. The ZenFS promises-based API is exposed to Python scripts via the `js_fs` object, which can be imported from the `js` module.

**Example (`/test.py` or similar):**
```python
# Python script running in Pyodide
import asyncio
from js import js_fs # Access ZenFS via JavaScript FFI

async def list_root_directory():
    print("Listing root directory from Python:")
    try:
        files = await js_fs.readdir('/')
        if not files:
            print("(No files found)")
        for f_name in files:
            print(f"- {f_name}")
        
        print("\nReading /welcome.txt:")
        content = await js_fs.readFile('/welcome.txt', 'utf-8')
        print(content)
    except Exception as e:
        print(f"Error accessing ZenFS: {e}")

asyncio.ensure_future(list_root_directory())
```
You can run this script using the command: `python /test.py` (assuming `test.py` with this content exists).

## File System

ZenFS provides the virtual file system. In the current configuration, it uses an **InMemory** backend. This means:
*   Files and directories are stored in the browser's memory.
*   **All data will be lost if the browser tab is closed or refreshed.**
*   For persistent storage, ZenFS supports other backends like IndexedDB, which could be configured in future enhancements.

## Known Limitations / Future Ideas

*   **`cp` command:** Does not currently support recursive copying for directories.
*   **Shell Metacharacters:** Does not support advanced shell features like command chaining (`&&`, `||`), pipes (`|`), or input/output redirection beyond `echo > file`.
*   **File Permissions:** File permissions and ownership are not implemented.
*   **Persistence:** Exploring ZenFS backends like IndexedDB or LocalStorage to allow file persistence across sessions.
*   **Package Loading in Pyodide:** No UI or mechanism for installing Python packages beyond what's included in the standard Pyodide distribution.
*   **Advanced Xterm.js Addons:** Could integrate addons like `xterm-addon-fit` for better resizing or `xterm-addon-web-links` for clickable links.

## Libraries Used

*   [Xterm.js](https://xtermjs.org/): For the terminal emulator interface.
*   [ZenFS](https://github.com/zenfs/zenfs): For the in-browser virtual file system.
*   [Pyodide](https://pyodide.org/): For running Python in WebAssembly.
