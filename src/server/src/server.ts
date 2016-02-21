'use strict';

import {
IPCMessageReader, IPCMessageWriter,
createConnection, IConnection, TextDocumentSyncKind,
TextDocuments, ITextDocument, Diagnostic, DiagnosticSeverity,
InitializeParams, InitializeResult, TextDocumentIdentifier,
CompletionItem, CompletionItemKind
} from 'vscode-languageserver';
import { exec } from 'child_process';
import 'process';
import { Request, RequestResult, RequestEventType, RequestParams } from '../../client/src/request';
import { BaseLinter } from './linter/baseLinter';
import { PyLinter } from './linter/pyLint';
import { Flake8 } from './linter/flake8';
import { fixPath } from './utils';

enum LinterType {
    FLAKE8,
    PYLINTER
}

// The settings interface describe the server relevant settings part
interface Settings {
    python: PythonSettings;
}

// These are the python settings we defined in the client's package.json
// file
interface PythonSettings {
    maxNumberOfProblems: number;
    linter: LinterType
}

const DEFAULT_LINTER = "pyLint";

// Create a connection for the server. The connection uses 
// stdin / stdout for message passing
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// hold the maxNumberOfProblems setting
let maxNumberOfProblems: number;


let linterMap: Map<string, LinterType> = new Map();
linterMap.set(DEFAULT_LINTER, LinterType.PYLINTER);
linterMap.set("pyLint", LinterType.PYLINTER);
linterMap.set("flake8", LinterType.FLAKE8);

// hold linter type
let linterType: LinterType = getLinterType(DEFAULT_LINTER);

// Linter
let linter: BaseLinter;

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites. 
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
    // connection.console.log(params.initializationOptions);
    workspaceRoot = params.rootPath;
    linter = loadLinter(linterType);
    // linter.enableConsole(connection.console);
    return {
        capabilities: {
            // Tell the client that the server works in FULL text document sync mode
            textDocumentSync: documents.syncKind
            // Tell the client that the server support code complete
            // completionProvider: {
            //     resolveProvider: true
            // }
        }
    }
});

// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
    let settings = <Settings>change.settings;
    loadSettings(settings.python);
    // Revalidate any open text documents
    documents.all().forEach(validateTextDocument);
});

function loadSettings(pythonSettings: any): void {
    maxNumberOfProblems = pythonSettings.maxNumberOfProblems || 100;
    linterType = getLinterType(pythonSettings.linter || DEFAULT_LINTER);
    linter = loadLinter(linterType);
    // connection.console.log("setings");
    // connection.console.log(maxNumberOfProblems.toString());
    // connection.console.log(pythonSettings.linter);
}

/**
 * Handles requests from the client
 * Returns the status of the handle attempt
 */
connection.onRequest(Request.type, (params: RequestParams): RequestResult => {
    // connection.console.log("REQUEST");
    // connection.console.log("REQUEST EVENT TYPE: " + params.requestEventType);
    let result: RequestResult;
    switch (params.requestEventType) {
        case RequestEventType.OPEN:
        case RequestEventType.SAVE:
            try {
                validateTextDocument(documents.get(params.uri.toString()));
                result = {
                    succesful: true
                };
            } catch (exception) {
                result = {
                    succesful: false,
                    message: exception.toString()
                };
            }
            break;
        case RequestEventType.CONFIG:
            loadSettings(params.configuration);
            break;
    }
    return result;
});



/**
 * Takes a text document and runs PyLint on it, sends Diagnostics back to client
 * @param  {ITextDocument} textDocument
 */
function validateTextDocument(textDocument: ITextDocument): void {
    linter.setDocument(textDocument);
    let cmd: string = linter.getCmd();

    exec(cmd, function(error: Error, stdout: ArrayBuffer, stderr: ArrayBuffer) {
        if (error.toString().length !== 0) {
            connection.console.warn(`[ERROR] File: ${linter.getFilepath()} - Error message: ${error.toString()}`);
            connection.console.warn(`[ERROR] Error output: ${stderr.toString()}`);
        }

        let results: string[] = stdout.toString().split(/\r?\n/g);
        results = linter.fixResults(results);
        
        // process linter output
        let diagnostics: Diagnostic[] = [];
        for (let result of results) {
            if (diagnostics.length >= maxNumberOfProblems) {
                break;
            } 
            let diagnostic = linter.parseLintResult(result);
            if (diagnostic != null) {
                diagnostics.push(diagnostic);
            }
        }
        connection.console.log(`File: ${linter.getFilepath()} - Errors Found: ${diagnostics.length.toString()}`);
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    });
}

connection.onDidChangeWatchedFiles((change) => {
    // Monitored files have change in VSCode
    connection.console.log('We recevied an file change event');
    documents.all().forEach(validateTextDocument);
});

function loadLinter(type: LinterType): BaseLinter {
    switch (type) {
        case LinterType.FLAKE8:
            return new Flake8();
        case LinterType.PYLINTER:
            return new PyLinter();
        default:
            return new PyLinter();
    }
}

function getLinterType(linter: string): LinterType {
    if (linterMap.has(linter)) {
        return linterMap.get(linter);
    }
    return linterMap.get(DEFAULT_LINTER);
}


// This handler provides the initial list of the completion items.
// connection.onCompletion((textDocumentPosition: TextDocumentIdentifier): CompletionItem[] => {
//     // The pass parameter contains the position of the text document in 
//     // which code complete got requested. For the example we ignore this
//     // info and always provide the same completion items.
//     return [
//         {
//             label: 'TypeScript',
//             kind: CompletionItemKind.Text,
//             data: 1
//         },
//         {
//             label: 'JavaScript',
//             kind: CompletionItemKind.Text,
//             data: 2
//         }
//     ]
// });

// // This handler resolve additional information for the item selected in
// // the completion list.
// connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
//     if (item.data === 1) {
//         item.detail = 'TypeScript details',
//         item.documentation = 'TypeScript documentation'
//     } else if (item.data === 2) {
//         item.detail = 'JavaScript details',
//         item.documentation = 'JavaScript documentation'
//     }
//     return item; 
// });
/*
connection.onDidOpenTextDocument((params) => {
    // A text document got opened in VSCode.
    // params.uri uniquely identifies the document. For documents store on disk this is a file URI.
    // params.text the initial full content of the document.
    connection.console.log(`${params.uri} opened.`);
});

connection.onDidChangeTextDocument((params) => {
    // The content of a text document did change in VSCode.
    // params.uri uniquely identifies the document.
    // params.contentChanges describe the content changes to the document.
    connection.console.log(`${params.uri} changed: ${JSON.stringify(params.contentChanges) }`);
    connection.console.log(`${params.uri} documents: ${JSON.stringify(documents.keys()) }`);
});


connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.uri} closed.`);
});
*/

// Listen on the connection
connection.listen();