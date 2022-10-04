# savescp README

The HPC cluster have stringent requirement on CPU & memory usage on login node, so I couldn't run a long-running process like vscode remote server on the login node. Therefore, I write this extension to simuate its behavior by running a scp command everytime a file is saved.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.
