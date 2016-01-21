'use strict';

import * as path from 'path';

import { languages, workspace, Uri, ExtensionContext, IndentAction, Diagnostic,
DiagnosticCollection, Range, Disposable, TextDocument } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions,
TransportKind} from 'vscode-languageclient';
import { Request, RequestParams, RequestResult, RequestError } from './request';

export function activate(context: ExtensionContext) {
    console.log("activate");
    let pythonExtension = new PythonExtension(context);

    let disposable: Disposable = pythonExtension.startServer();
    
    
    // Push the disposable to the context's subscriptions so that the 
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
}


class PythonExtension {
    private _context: ExtensionContext;
    private _languageClient: LanguageClient;

    constructor(context: ExtensionContext) {
        this._context = context;
    }

    private getOptions(): { serverOptions: ServerOptions, clientOptions: LanguageClientOptions } {
        // The server is implemented in node
        let serverModule = this._context.asAbsolutePath(path.join('out', 'server', 'src', 'server.js'));
        // The debug options for the server
        let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
        
        // If the extension is launch in debug mode the debug server options are use
        // Otherwise the run options are used
        let serverOptions: ServerOptions = {
            run: { module: serverModule, transport: TransportKind.ipc },
            debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
        }
        
        // Options to control the language client
        let clientOptions: LanguageClientOptions = {
            // Register the server for plain text documents
            documentSelector: ['python'],
            synchronize: {
                // Synchronize the setting section 'languageServerExample' to the server
                configurationSection: 'python',
                // Notify the server about file changes to '.pylintrc files contain in the workspace
                fileEvents: workspace.createFileSystemWatcher('**/.pylintrc')
            }
        }

        return { "serverOptions": serverOptions, "clientOptions": clientOptions };
    }

    private _onSave(e: TextDocument) {
        if (e.languageId !== 'python') {
            return;
        }
        let params: RequestParams = { processId: 0, uri: e.uri };
        this._languageClient.sendRequest(Request.type, params);
    }

    private _registerEvents(): void {
        // subscribe to trigger when the file is saved
        let subscriptions: Disposable[] = [];
        workspace.onDidSaveTextDocument(this._onSave, this, subscriptions);
    }

    public startServer(): Disposable {
        let options = this.getOptions();
        
        // Create the language client and start the client.
        this._languageClient = new LanguageClient('Python Language Server', options.serverOptions, options.clientOptions);
        this._registerEvents();
        return this._languageClient.start();
    }
}