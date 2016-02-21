'use strict';

import * as path from 'path';

import { languages, workspace, Uri, ExtensionContext, IndentAction, Diagnostic,
DiagnosticCollection, Range, Disposable, TextDocument, window,
WorkspaceConfiguration, TextDocumentChangeEvent, Position,
TextLine } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions,
TransportKind } from 'vscode-languageclient';
import { Request, RequestParams, RequestResult, RequestError, RequestEventType } from './request';

export function activate(context: ExtensionContext) {
    console.log("activate");
    let pythonExtension = new PythonExtension(context);

    let disposable: Disposable = pythonExtension.startServer();
    
    
    // Push the disposable to the context's subscriptions so that the 
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
}

//TODO: perform autosave setting check, notify user if disabled
class PythonExtension {
    private _context: ExtensionContext;
    private _languageClient: LanguageClient;

    constructor(context: ExtensionContext) {
        this._context = context;
    }

    private _getOptions(): { serverOptions: ServerOptions, clientOptions: LanguageClientOptions } {
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
            // Register the server for python documents
            documentSelector: ['python'],
            synchronize: {
                // Synchronize the setting section 'languageServerExample' to the server
                configurationSection: 'python',
                // Notify the server about file changes to '.pylintrc files contain in the workspace
                fileEvents: workspace.createFileSystemWatcher('**/.pylintrc')
            },
            initializationOptions: {
                debug: true
            }
        }

        return { "serverOptions": serverOptions, "clientOptions": clientOptions };
    }

    private _onSave(doc: TextDocument): void {
        if (doc.languageId !== 'python') {
            return;
        }
        let params: RequestParams = { processId: process.pid, uri: doc.uri, requestEventType: RequestEventType.SAVE };
        let cb = (result: RequestResult) => {
            if (!result.succesful) {
                console.error("Lintings failed on save");
                console.error(`File: ${params.uri.toString()}`);
                console.error(`Message: ${result.message}`);
            }
        }
        this._doRequest(params, cb);
    }
    
    //TODO: need to add check if isDirty, save if it is, check that autosave is enabled
    private _onOpen(doc: TextDocument): void {
        if (doc.languageId !== 'python') {
            return;
        }
        let params: RequestParams = { processId: process.pid, uri: doc.uri, requestEventType: RequestEventType.OPEN };
        let cb = (result: RequestResult) => {
            if (!result.succesful) {
                console.error("Lintings failed on open");
                console.error(`File: ${params.uri.toString()}`);
                console.error(`Message: ${result.message}`);
            }
        }
        this._doRequest(params, cb);
    }
    
    private _isControlStatement(line: TextLine): boolean {
        let text = line.text.substring(line.firstNonWhitespaceCharacterIndex);
        let controlStatementRegExp = new RegExp("^(?:def|class|for|if|elif|else|while).*?:\s*$", "gm");
        return text.search(controlStatementRegExp) !== -1;
    }

    private _onChange(e: TextDocumentChangeEvent): void {
        let doc = e.document;
        let changes = e.contentChanges[0];
        if (doc.languageId !== 'python' ||
            (!changes.text.includes('\n') &&
            !changes.text.includes('\r\n'))) {
            return;
        }
        let range = changes.range;
        // add two lines, one for index from 0, other for new line just inserted
        if (range.end.line + 2 == doc.lineCount) return;
        let changeLine = doc.lineAt(range.start.line);
        // if the new Line occured after a ':' then add indentation
        if (this._isControlStatement(changeLine)) {
            if (window.activeTextEditor.document.version !==
                doc.version) {
                return;
            }
            window.activeTextEditor.edit(editBuilder => {
                //TODO: ensure that the indentation has not already been done
                let editorConfig = workspace.getConfiguration("editor");
                let insertSpaces = editorConfig.get<boolean>("insertSpaces");

                let insertString: string;
                if (!insertSpaces) {
                    insertString = "\t";
                } else {
                    let tabSize = editorConfig.get<string | number>("tabSize");
                    if (tabSize == "auto" || isNaN(<number>tabSize)) {
                        tabSize = 4;
                    }
                    insertString = " ".repeat(<number>tabSize);
                }
                let currentLineIndent = changeLine.firstNonWhitespaceCharacterIndex;
                let nextLineIndent = doc.lineAt(range.start.line + 1).firstNonWhitespaceCharacterIndex;
                if (currentLineIndent + insertString.length > nextLineIndent) {
                    editBuilder.insert(new Position(range.start.line + 1, 0), insertString);
                }
            });
        }
    }

    private _sendConfig(): void {
        let configuration: WorkspaceConfiguration = workspace.getConfiguration('python');
        let params: RequestParams = {
            processId: process.pid,
            configuration: configuration,
            requestEventType: RequestEventType.CONFIG
        };
        let cb = (result: RequestResult) => {
            if (!result.succesful) {
                console.error("Error loading configuration");
                console.error(`Message: ${result.message}`);
            }
        }
        this._doRequest(params, cb);
    }

    private _doRequest(params: RequestParams, cb: (RequestResult) => void): void {
        this._languageClient.sendRequest(Request.type, params).then(cb);
    }

    private _registerEvents(): void {
        // subscribe to trigger when the file is saved or opened
        let subscriptions: Disposable[] = [];
        workspace.onDidSaveTextDocument(this._onSave, this, subscriptions);
        workspace.onDidOpenTextDocument(this._onOpen, this, subscriptions);
        workspace.onDidChangeTextDocument(this._onChange, this, subscriptions);
    }

    public startServer(): Disposable {
        let options = this._getOptions();
        
        // Create the language client and start the client.
        this._languageClient = new LanguageClient('Python Language Server', options.serverOptions, options.clientOptions);
        this._registerEvents();
        let start = this._languageClient.start();
        this._onOpen(window.activeTextEditor.document);
        return start;
    }
}