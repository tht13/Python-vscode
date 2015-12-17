/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
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

// Create a connection for the server. The connection uses 
// stdin / stdout for message passing
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites. 
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;
    return {
        capabilities: {
            // Tell the client that the server works in FULL text document sync mode
            textDocumentSync: documents.syncKind,
            // Tell the client that the server support code complete
            completionProvider: {
                resolveProvider: true
            }
        }
    }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
    validateTextDocument(change.document);
});

// The settings interface describe the server relevant settings part
interface Settings {
    python: PythonSettings;
}

// These are the python settings we defined in the client's package.json
// file
interface PythonSettings {
    maxNumberOfProblems: number;
}

// hold the maxNumberOfProblems setting
let maxNumberOfProblems: number;
// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
    let settings = <Settings>change.settings;
    maxNumberOfProblems = settings.python.maxNumberOfProblems || 100;
    // Revalidate any open text documents
    documents.all().forEach(validateTextDocument);
});

function validateTextDocument(textDocument: ITextDocument): void {
    let path = textDocument.uri;
    // disabled to improve performence, can be enabled if features require
    // let documentLines = textDocument.getText().split(/\r?\n/g);
    if (/^win/.test(process.platform)) {
        path = path.replace('file:///', '').replace('%3A', ':').replace('/', '\\');
    } else {
        path = path.replace('file://', '');
    }
    connection.console.log(textDocument.uri);
    connection.console.log(path);
    var cmd = 'pylint -r n '+path;

    exec(cmd, function(error, stdout, stderr) {
        let result = stdout.toString().split('\r\n');
        
        // remove lines up to first error message
        let i = 0;
        while (!result[i].startsWith('***')) {
            result.shift();
            i++;
        }
        result.shift();
        
        // log error messages
        let diagnostics: Diagnostic[] = [];
        for (let i in result) {
            if (result[i].length === 0) {
                continue;
            }
            let match = result[i].match(/(\w):([\s\d]{3,}),([\s\d]{2,}): (.+?(:?'.+?').*?) (\(.*\))/);
            if (match == null) {
                continue;
            }
            let severity = 0;
            switch (match[1]) {
                case 'C':
                    severity = DiagnosticSeverity.Error;
                    break;
                case 'F':
                    severity = DiagnosticSeverity.Error;
                    break;
                case 'W':
                    severity = DiagnosticSeverity.Warning;
                    break;
                case 'C':
                    severity = DiagnosticSeverity.Hint;
                    break;
                case 'R':
                    severity = DiagnosticSeverity.Hint;
                    break;
                default:
                    severity = DiagnosticSeverity.Error;
                    break;
            }
            
            // implement multiLine messages
            // ie lineStart and lineEnd
            let line = parseInt(match[2])-1;
            let colStart = parseInt(match[3]);
            let colEnd = Number.MAX_VALUE;
            if (match[5].length !== 0) {
                // subtract two because match includes the two quotes
                colEnd = colStart+match[5].length-2;
            }
            
            diagnostics.push({
                severity: severity,
                range: {
                    start: { line: line, character: colStart },
                    end: { line: line, character: colEnd }
                },
                message: match[4]+' '+match[6]
            });
            connection.console.log(`${JSON.stringify(match) }`);
        }
        connection.console.log(`File: ${ path } - Errors Found: ${ diagnostics.length.toString() }`)
        // connection.console.log(`Problems: ${problems}: ${JSON.stringify(diagnostics) }`);
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    });
}

connection.onDidChangeWatchedFiles((change) => {
    // Monitored files have change in VSCode
    connection.console.log('We recevied an file change event');
});


// This handler provides the initial list of the completion items.
connection.onCompletion((textDocumentPosition: TextDocumentIdentifier): CompletionItem[] => {
    // The pass parameter contains the position of the text document in 
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return [
        {
            label: 'TypeScript',
            kind: CompletionItemKind.Text,
            data: 1
        },
        {
            label: 'JavaScript',
            kind: CompletionItemKind.Text,
            data: 2
        }
    ]
});

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
        item.detail = 'TypeScript details',
        item.documentation = 'TypeScript documentation'
    } else if (item.data === 2) {
        item.detail = 'JavaScript details',
        item.documentation = 'JavaScript documentation'
    }
    return item; 
});
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