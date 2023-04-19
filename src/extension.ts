// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const glob = require('glob');
const pLimit = require('p-limit');
const limit = pLimit(10);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	let config = vscode.workspace.getConfiguration("saveremote");
	let enable = config.URL.length > 0 && config.localPrefix.length > 0 && config.remotePrefix.length > 0;

	let lastMessage = '';
	let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	statusBarItem.text = enable ? "Ready" : "Disabled";
	statusBarItem.command = 'saveremote.lastMessage';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	function error_callback(error:any) {
		statusBarItem.text = "Failed";
		lastMessage = error.message;
		vscode.window.showInformationMessage(lastMessage);
	}

	async function download(remotePath:string) {
		let formData = new URLSearchParams();
		formData.append("auth", config.Auth);
		formData.append("path", remotePath);

		await axios.post(config.URL + 'download', formData, {responseType: 'arraybuffer'}).then(async (response:any) => {
			if (response.headers['content-type'].includes('application/json')) {
				let json = JSON.parse(response.data.toString());
				await Promise.all(json.files.map((f:any) => {
					return limit(() => download(f));
				}));
			} else {
				let relativePath = remotePath.substring(config.remotePrefix.length);
				let localPath = config.localPrefix + relativePath.split(path.posix.sep).join(path.sep);
				await fs.promises.mkdir(path.dirname(localPath), {recursive: true});
				await fs.promises.writeFile(localPath, response.data);
			}
		}).catch(error_callback);
	}

	async function upload(filename:string) {
		let relativePath = filename.substring(config.localPrefix.length);
		let remotePath = config.remotePrefix + relativePath.split(path.sep).join(path.posix.sep);

		let formData = new FormData();
		formData.append("auth", config.Auth);
		formData.append("path", remotePath);
		formData.append('file', fs.createReadStream(filename));
		await axios.post(config.URL + 'upload', formData).catch(error_callback);
	}

	async function walkdir(filename:string) {
		let dirents = await fs.promises.readdir(filename, { withFileTypes: true });
		let files = await Promise.all(dirents.map((dirent:any) => {
			let child = path.join(filename, dirent.name);
			return dirent.isDirectory() ? walkdir(child) : child;
		}));
		return files.flat()
	}

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('saveremote.lastMessage', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage(lastMessage);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('saveremote.enable', () => {
		enable = true;
		statusBarItem.text = "Ready";
		vscode.window.showInformationMessage("SaveRemote Enabled");
	}));

	context.subscriptions.push(vscode.commands.registerCommand('saveremote.disable', () => {
		enable = false;
		statusBarItem.text = "Disabled";
		vscode.window.showInformationMessage("SaveRemote Disabled");
	}));

	context.subscriptions.push(vscode.commands.registerCommand('saveremote.download', async () => {
		let relativePath = await vscode.window.showInputBox({placeHolder: "Relative Path to Download"});

		if (relativePath) {
			let cmd = `Downloading ${relativePath}`;
			statusBarItem.text = cmd;
			lastMessage = cmd;

			let remotePath = config.remotePrefix + relativePath.split(path.sep).join(path.posix.sep);
			await download(remotePath);

			if (statusBarItem.text !== "Failed") {
				statusBarItem.text = "Downloaded";
				lastMessage += "; Downloaded";
			}
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('saveremote.upload', async () => {
		let relativePath = await vscode.window.showInputBox({placeHolder: "Relative Path to Upload"});

		if (relativePath) {
			let cmd = `Uploading ${relativePath}`;
			statusBarItem.text = cmd;
			lastMessage = cmd;

			let localPath = config.localPrefix + relativePath;
			fs.stat(localPath, async (error:any, stats:any) => {
				if (error) {
					let globs = await glob.glob(localPath, { windowsPathsNoEscape: true });
					if (globs.length > 0) {
						await Promise.all(globs.map((f:any) => {
							return limit(() => upload(f));
						}));
					} else {
						statusBarItem.text = "Failed";
						lastMessage = error.message;
						vscode.window.showInformationMessage(lastMessage);
					}
				} else {
					if (stats.isFile()) {
						await upload(localPath);
					} else {
						if (stats.isDirectory()) {
							let files = await walkdir(localPath);
							await Promise.all(files.map((f:any) => {
								return limit(() => upload(f));
							}));
						} else {
							statusBarItem.text = "Failed";
							lastMessage = `NotFound: ${relativePath}`;
							vscode.window.showInformationMessage(lastMessage);
						}
					}
				}
				if (statusBarItem.text !== "Failed") {
					statusBarItem.text = "Uploaded";
					lastMessage += "; Uploaded";
				}
			})
		}
	}));

	vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		if (enable && document.uri.scheme === "file") {
			let filename = document.fileName;
			if (filename.includes(".pyc") || filename.includes(".git") || !filename.includes(config.localPrefix)) {
				return;
			}

			let relativePath = filename.substring(config.localPrefix.length);
			let remotePath = config.remotePrefix + relativePath.split(path.sep).join(path.posix.sep);
			let cmd = `Sending ${relativePath} to ${remotePath}`;
			statusBarItem.text = cmd;
			lastMessage = cmd;

			await upload(filename);

			statusBarItem.text = "Saved";
			lastMessage += "; Saved";
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
