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

	let lastMessage = '';
	let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	statusBarItem.text = "Ready";
	statusBarItem.command = 'savescp.lastMessage';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('savescp.lastMessage', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage(lastMessage);
	}));

	const HOST = "yuzhongh@discovery1.usc.edu";
	const SRC = "c:\\Users\\yuzho\\surface_recon\\";
	const TGT = "/home1/yuzhongh/surface_recon/";

	vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		if (document.uri.scheme === "file") {
			let filename = document.fileName;
			if (filename.includes(".pyc") || filename.includes(".git") || !filename.includes(SRC)) {
				return;
			}
			let cmd = `scp ${filename} ${HOST}:${filename.replace(SRC, TGT)}`;
			statusBarItem.text = cmd;

			lastMessage = cmd;
			let scp = child_process.spawn(cmd, {shell: true});
			scp.stdout.on('data', (data) => {
				lastMessage += data.toString();
				vscode.window.showInformationMessage(`stdout: ${data}`);
			});
			  
			scp.stderr.on('data', (data) => {
				lastMessage += data.toString();
				vscode.window.showInformationMessage(`stderr: ${data}`);
			});
			  
			scp.on('close', (code) => {
				if (code === 0) {
					statusBarItem.text = "Saved";
				} else {
					vscode.window.showInformationMessage(`scp process exited with code ${code}`);
					statusBarItem.text = "Failed";
				}
			})

			setTimeout(() => {
				if (scp.connected) {
					vscode.window.showInformationMessage(`scp process timeout after 5 sec`);
					scp.kill();
				}
			}, 5000)
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
