// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as child_process from 'child_process'

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "savescp" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('savescp.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from SaveSCP!');
	});

	context.subscriptions.push(disposable);

	const HOST = "yuzhongh@discovery1.usc.edu";
	const SRC = "/c:/Users/yuzho/surface_recon/";
	const TGT = "/home1/yuzhongh/surface_recon/";

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		if (document.uri.scheme === "file") {
			let filename = document.uri.path;
			if (filename.includes(".pyc") || filename.includes(".git") || !filename.includes(SRC)) {
				return;
			}
			let cmd = `scp ${document.fileName} ${HOST}:${filename.replace(SRC, TGT)}`;
			console.log(cmd);

			let scp = child_process.spawn(cmd, {shell: true});
			scp.stdout.on('data', (data) => {
				console.log(`stdout: ${data}`);
			});
			  
			scp.stderr.on('data', (data) => {
				console.error(`stderr: ${data}`);
			});
			  
			scp.on('close', (code) => {
				console.log(code);
				if (code !== 0) {
					vscode.window.showInformationMessage(`scp process exited with code ${code}`);
				}
			})

			setTimeout(() => {
				if (scp.connected) {
					vscode.window.showInformationMessage(`scp process timeout after 5 sec`);
				}
			}, 5000)
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
