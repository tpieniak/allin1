import { configure, fs as zenFS } from 'https://cdn.jsdelivr.net/npm/@zenfs/core@2.2.3/dist/index.js';
import { InMemory } from 'https://cdn.jsdelivr.net/npm/@zenfs/core@2.2.3/dist/backends/memory.js';

// Expose ZenFS fs to global scope for easier debugging and future use
window.zenFS = zenFS; // zenFS.promises will be used
window.pyodide = null; // Will be assigned after Pyodide loads

// Initialize xterm.js
const term = new Terminal({ // Assuming Terminal is global from xterm.js script tag
    cursorBlink: true,
    theme: {
        background: '#000000',
        foreground: '#ffffff',
    },
    convertEol: true // Convert \n to \r\n for terminal display
});

// Attach the terminal to the 'terminal' div
const terminalContainer = document.getElementById('terminal');
let currentPath = '/'; // Initialize currentPath

// --- Path Resolution Helper ---
function resolvePath(pathArg) {
    if (!pathArg || pathArg === '.') {
        return currentPath;
    }

    let newPath;
    if (pathArg.startsWith('/')) {
        newPath = pathArg; // Absolute path
    } else {
        newPath = currentPath === '/' ? `/${pathArg}` : `${currentPath}/${pathArg}`; // Relative path
    }

    // Normalize the path (handle '..' and '.')
    const parts = newPath.split('/').filter(part => part !== '' && part !== '.');
    const normalizedParts = [];
    for (const part of parts) {
        if (part === '..') {
            if (normalizedParts.length > 0) {
                normalizedParts.pop();
            }
        } else {
            normalizedParts.push(part);
        }
    }

    let resolved = '/' + normalizedParts.join('/');
    if (resolved.length > 1 && resolved.endsWith('/')) { // Avoid trailing slash unless it's root
        resolved = resolved.slice(0, -1);
    }
    return resolved || '/'; // Ensure root is always '/'
}

const testPyScript = `
# /test.py
print("Hello from test.py executed by Pyodide!")
import asyncio
from js import js_fs # This is how we access the ZenFS promises object

async def main():
    try:
        current_zenfs_path = '/' # Change if you want to test other paths
        print(f"Listing ZenFS path '{current_zenfs_path}' from Python:")
        files = await js_fs.readdir(current_zenfs_path)
        if not files:
            print("(No files found)")
        for f_name in files: # Assuming files is an array of strings
            print(f"- {f_name}")
        
        print("\\nAttempting to read /welcome.txt from ZenFS via Python:")
        content = await js_fs.readFile('/welcome.txt', 'utf-8')
        print("Content of /welcome.txt:")
        print(content)

    except Exception as e:
        print(f"Error accessing ZenFS from Python: {e}")

asyncio.ensure_future(main())
`;

async function initializeZenFS() {
    try {
        term.writeln("Initializing ZenFS...");
        await configure({
            mounts: {
                '/': { backend: InMemory, name: 'mem' }
            }
        });
        console.log('ZenFS initialized successfully.');
        term.writeln('ZenFS initialized with InMemory backend at /');
        await zenFS.promises.writeFile('/welcome.txt', 'Welcome to the ZenFS file system!\nType `ls` to see this file.\nType `python /test.py` to run a sample Python script.');
        await zenFS.promises.mkdir('/home');
        await zenFS.promises.mkdir('/home/user');
        await zenFS.promises.writeFile('/test.py', testPyScript);
        term.writeln('Created /welcome.txt, /home/user, and /test.py.');
        return true;
    } catch (error) {
        console.error('Error initializing ZenFS:', error);
        term.writeln(`Critical Error initializing ZenFS: ${error.message}`);
        return false;
    }
}

async function initializePyodide() {
    try {
        term.writeln("Loading Pyodide runtime...");
        console.log("Loading Pyodide...");
        // loadPyodide is globally available from the pyodide.js script
        const pyodideInstance = await loadPyodide({
            // indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/" // Usually not needed if using full/pyodide.js
        });
        window.pyodide = pyodideInstance; // Make it global
        console.log("Pyodide loaded successfully.");
        term.writeln("Pyodide runtime loaded.");

        // Setup stdout and stderr redirection
        window.pyodide.setStdout({ batched: (str) => term.write(str.replace(/\n/g, '\r\n') + '\r\n') });
        window.pyodide.setStderr({ batched: (str) => term.write(str.replace(/\n/g, '\r\n') + '\r\n') });
        
        term.writeln("Pyodide stdout/stderr redirected to terminal.");
        return true;
    } catch (error) {
        console.error('Error loading Pyodide:', error);
        term.writeln(`Critical Error loading Pyodide: ${error.message}`);
        return false;
    }
}


function writePrompt() {
    term.write(`\r\n${currentPath}$ `);
}

// --- Command Handlers ---
async function handleLs(args) {
    const targetPath = args.length > 0 ? resolvePath(args[0]) : currentPath;
    try {
        const files = await zenFS.promises.readdir(targetPath);
        if (files.length === 0) {
            term.writeln(''); 
        } else {
            files.forEach(file => term.writeln(file));
        }
    } catch (error) {
        term.writeln(`ls: ${targetPath}: ${error.message}`);
    }
}

async function handleCd(args) {
    if (args.length === 0) {
        term.writeln("cd: missing operand");
        return;
    }
    const newPath = resolvePath(args[0]);
    try {
        const stats = await zenFS.promises.stat(newPath);
        if (stats.isDirectory()) {
            currentPath = newPath;
        } else {
            term.writeln(`cd: ${newPath}: Not a directory`);
        }
    } catch (error) {
        term.writeln(`cd: ${newPath}: ${error.message}`);
    }
}

async function handleMkdir(args) {
    if (args.length === 0) {
        term.writeln("mkdir: missing operand");
        return;
    }
    const dirName = args[0];
    if (dirName.includes('/') || dirName === '.' || dirName === '..') {
        term.writeln(`mkdir: invalid directory name: ${dirName}`);
        return;
    }
    const newDirPath = resolvePath(dirName);
    try {
        await zenFS.promises.mkdir(newDirPath);
        term.writeln(`mkdir: created directory '${newDirPath}'`);
    } catch (error) {
        term.writeln(`mkdir: ${newDirPath}: ${error.message}`);
    }
}

async function handleCat(args) {
    if (args.length === 0) {
        term.writeln("cat: missing operand");
        return;
    }
    const filePath = resolvePath(args[0]);
    try {
        const data = await zenFS.promises.readFile(filePath, 'utf8');
        term.write(data.replace(/\n/g, '\r\n')); 
    } catch (error) {
        term.writeln(`cat: ${filePath}: ${error.message}`);
    }
}

async function handleEcho(args) {
    const redirectIndex = args.indexOf('>');
    if (redirectIndex === -1 || redirectIndex === args.length - 1) {
        term.writeln(args.join(' '));
        return;
    }

    const text = args.slice(0, redirectIndex).join(' ');
    const rawFileName = args[redirectIndex + 1];
     if (!rawFileName) {
        term.writeln("echo: missing filename after '>'");
        return;
    }
    if (rawFileName.includes('/')) {
        term.writeln(`echo: filename cannot contain '/': ${rawFileName}`);
        return;
    }
    const filePath = resolvePath(rawFileName);

    try {
        await zenFS.promises.writeFile(filePath, text + '\n');
        term.writeln(`echo: wrote to ${filePath}`);
    } catch (error) {
        term.writeln(`echo: ${filePath}: ${error.message}`);
    }
}

async function handlePython(args) {
    if (!window.pyodide) {
        term.writeln("Pyodide is not loaded or failed to initialize.");
        return;
    }
    if (!window.pyodide) {
        term.writeln("Pyodide is not loaded or failed to initialize.");
        return;
    }
    if (args.length === 0) {
        term.writeln("Usage: python [-c \"code\" | <path_to_script.py>]");
        return;
    }

    window.pyodide.globals.set('js_fs', window.zenFS.promises); // Ensure js_fs is always available

    if (args[0] === '-c') {
        if (args.length < 2) {
            term.writeln("python: -c requires an argument (code to execute)");
            return;
        }
        const codeToExecute = args.slice(1).join(' ');
        term.writeln(`Executing Python code: "${codeToExecute}"`);
        try {
            await window.pyodide.runPythonAsync(codeToExecute);
        } catch (error) {
            term.writeln(`Error executing Python code: ${error.message || error}`);
            console.error("Python -c execution error:", error);
        }
    } else {
        const filePath = resolvePath(args[0]);
        try {
            const pythonCode = await window.zenFS.promises.readFile(filePath, 'utf-8');
            term.writeln(`Executing ${filePath} with Pyodide...`);
            await window.pyodide.runPythonAsync(pythonCode);
        } catch (error) {
            if (error.message && error.message.includes("No such file or directory") && error.path === filePath) {
                 term.writeln(`python: can't open file '${filePath}': No such file or directory`);
            } else if (error.name === 'PythonError') { // Pyodide wraps Python errors
                // Pyodide's error message often includes the Python traceback, which is good.
                term.writeln(`Error in Python script ${filePath}:\n${error.message}`);
            }
             else {
                term.writeln(`Error executing Python script ${filePath}: ${error.message || error}`);
                console.error("Python script execution error:", error);
            }
        }
    }
}

// Helper function for recursive deletion
async function recursiveDelete(pathToDelete) {
    const stats = await window.zenFS.promises.stat(pathToDelete);
    if (stats.isDirectory()) {
        const files = await window.zenFS.promises.readdir(pathToDelete);
        for (const file of files) {
            // Correctly join path for recursion
            const entryPath = [pathToDelete, file].join('/').replace('//', '/');
            await recursiveDelete(entryPath);
        }
        await window.zenFS.promises.rmdir(pathToDelete);
        term.writeln(`Removed directory: ${pathToDelete}`);
    } else {
        await window.zenFS.promises.unlink(pathToDelete);
        term.writeln(`Removed file: ${pathToDelete}`);
    }
}

async function handleRm(args) {
    if (args.length === 0) {
        term.writeln("rm: missing operand");
        return;
    }
    const targetPath = resolvePath(args[0]);

    if (targetPath === '/') {
        term.writeln("rm: cannot remove root directory");
        return;
    }

    try {
        await recursiveDelete(targetPath);
        // term.writeln(`Successfully removed ${targetPath}`); // Covered by recursiveDelete messages
    } catch (error) {
        if (error.message && error.message.includes("No such file or directory")) {
            term.writeln(`rm: cannot remove '${targetPath}': No such file or directory`);
        } else if (error.code === 'ENOTEMPTY') { // Though recursiveDelete should handle this
            term.writeln(`rm: ${targetPath}: Directory not empty (or failed to empty recursively)`);
        } 
        else {
            term.writeln(`rm: ${targetPath}: ${error.message || error}`);
            console.error("rm error:", error);
        }
    }
}

async function handleCp(args) {
    if (args.length < 2) {
        term.writeln("cp: missing file operand");
        return;
    }
    const sourcePathRaw = args[0];
    const destPathRaw = args[1];

    const sourcePath = resolvePath(sourcePathRaw);
    let destPath = resolvePath(destPathRaw);

    try {
        const sourceStats = await window.zenFS.promises.stat(sourcePath);
        if (sourceStats.isDirectory()) {
            term.writeln(`cp: ${sourcePathRaw}: is a directory (not supported for copying)`);
            return;
        }

        let targetFileName = sourcePath.split('/').pop(); // Get filename from source

        // Check if destination is an existing directory
        try {
            const destStats = await window.zenFS.promises.stat(destPath);
            if (destStats.isDirectory()) {
                destPath = [destPath, targetFileName].join('/').replace('//', '/'); // Append source filename to dest dir
            }
        } catch (e) {
            // Destination does not exist or is not a directory, proceed.
            // This means destPath is treated as a full file path.
            // If destPathRaw was './newfile.txt' and currentPath is '/home', destPath is '/home/newfile.txt'.
            // If destPathRaw was '/somedir/newfile.txt', destPath is '/somedir/newfile.txt'.
        }
        
        // Check if source and destination are the same
        if (sourcePath === destPath) {
            term.writeln(`cp: '${sourcePathRaw}' and '${destPathRaw}' are the same file`);
            return;
        }

        const data = await window.zenFS.promises.readFile(sourcePath); // Read as buffer/binary
        await window.zenFS.promises.writeFile(destPath, data);
        term.writeln(`Copied '${sourcePathRaw}' to '${destPathRaw}' (resolved: ${sourcePath} to ${destPath})`);

    } catch (error) {
        if (error.message && error.message.includes("No such file or directory")) {
            term.writeln(`cp: cannot stat '${sourcePathRaw}': No such file or directory`);
        } else {
            term.writeln(`cp: ${error.message || error}`);
            console.error("cp error:", error);
        }
    }
}


async function processCommand(commandString) {
    const trimmedCommand = commandString.trim();
    if (!trimmedCommand) {
        return;
    }

    const parts = trimmedCommand.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    term.writeln(''); 

    switch (command) {
        case 'ls':
            await handleLs(args);
            break;
        case 'cd':
            await handleCd(args);
            break;
        case 'mkdir':
            await handleMkdir(args);
            break;
        case 'cat':
            await handleCat(args);
            break;
        case 'echo':
            await handleEcho(args);
            break;
        case 'python':
            await handlePython(args);
            break;
        case 'clear':
            term.clear();
            break;
        default:
            term.writeln(`Command not found: ${command}`);
    }
}


if (terminalContainer) {
    term.open(terminalContainer);
    // term.loadAddon(new FitAddon.FitAddon()); 
    // term.fit();
    // window.addEventListener('resize', () => term.fit());

    term.writeln("Welcome to WebTerminal!");
    
    async function mainInitialization() {
        const zenfsReady = await initializeZenFS();
        if (zenfsReady) {
            const pyodideReady = await initializePyodide();
            if (pyodideReady) {
                term.writeln("Initialization complete. Type 'ls', 'python /test.py', etc.");
            } else {
                term.writeln("Pyodide initialization failed. Python execution will not be available.");
            }
        } else {
            term.writeln("ZenFS initialization failed. File system operations may not work.");
        }
        writePrompt();
    }

    mainInitialization();

    let currentCommand = "";

    term.onKey(async ({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

        if (domEvent.key === 'Enter') {
            await processCommand(currentCommand);
            currentCommand = "";
            writePrompt();
        } else if (domEvent.key === 'Backspace') {
            if (currentCommand.length > 0) {
                term.write('\b \b');
                currentCommand = currentCommand.slice(0, -1);
            }
        } else if (printable && domEvent.key.length === 1) { 
            term.write(key);
            currentCommand += key;
        }
    });

} else {
    console.error("Terminal container 'terminal' not found.");
}
