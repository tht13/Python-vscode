"use strict";
import { RemoteConsole, Diagnostic, 
    DiagnosticSeverity, Range, 
    ITextDocument } from 'vscode-languageserver';
import { fixPath, validatePath } from './../utils';

//TODO: Handle false return from validatePath better

export class BaseLinter {
    protected _target: string;
    protected _args: string[];
    protected _filepath: string;
    protected _documentText: string[];
    protected _severityMap: Map<string, DiagnosticSeverity>;
    private _regExp: RegExp;
    private _consoleEnabled: boolean = false;
    private _console: RemoteConsole;

    constructor(target: string, args?: string[]) {
        args = args || [];
        this._target = target;
        this._args = args;
        this.buildSeverityMap();
    };
    
    /**
     * Get the command line string to run for the file
     * @returns string
     */
    getCmd(): string {
        if (validatePath(this._filepath)) {
            //TODO: destructuring not allowed yet e.g. ...this.args
            let cmd: string[] = [].concat([this._target], this._args, [this._filepath]);
            return cmd.join(" ");
        } else {
            this.error(`Error generating command`)
            this.error(`File does not exist: ${this._filepath}`);
        }
    }
    
    /**
     * Get the target linter to execute
     * @returns string
     */
    getTarget(): string {
        return this._target;
    }
    
    /**
     * Set the command line target for the linter
     * Used when a linter is in a custom location
     * @param  {string} target The target of the linter
     */
    setTarget(target: string) {
        if (validatePath(target)) {
            this._target = target;
        } else {
            this.error(`Error setting target`)
            this.error(`Target does not exist: ${target}`);
        }
    }

    getRegExp(): RegExp {
        return this._regExp;
    }
    
    /**
     * Set the RegExp to use to parse lint results
     * @throws {EvalError} Thrown when the input pattern is invalid
     * @param  {string} pattern The regular expression patter
     * @param  {string=""} flags A string of character flags (igm) to use in the RegExp, Defaults to none
     */
    setRegExp(pattern: string, flags?: string) {
        flags = flags || "";
        try {
            let regExp = new RegExp(pattern, flags);
            this._regExp = regExp;
        } catch (e) {
            this.warn(e.toString());
            throw new EvalError();
        }
    }

    setDocument(doc: ITextDocument) {
        let path = fixPath(doc.uri);
        if (validatePath(path)) {
            this._filepath = path;
            this._documentText = doc.getText().split(/\r?\n/g);
            this.log(`Loaded document: ${this._filepath}`);
        } else {
            this.error(`Error loading document`)
            this.error(`File does not exist: ${path}`);
        }
    }

    getFilepath(): string {
        return this._filepath;
    }

    fixResults(results: string[]): string[] {
        return results;
    }
    
    /**
     * Parses a linting result and returns the Diagnostic result
     * @param  {string} line The line from command line to parse
     * @returns Diagnostic
     */
    parseLintResult(line: string): Diagnostic {
        let dummyDiagnostic: Diagnostic = {
            message: "Dummy diagnostic",
            range: this.createRange(0, 0, 0, 1)
        };
        return dummyDiagnostic;
    }
    
    /**
     * Creates a Range from the input line and character positions
     * @param  {number} startLine The starting line
     * @param  {number} startChar The starting character
     * @param  {number} endLine The ending line
     * @param  {number} endChar The ending character
     * @returns Range
     */
    protected createRange(startLine: number, startChar: number, endLine: number, endChar: number): Range {
        return {
            start: {
                line: startLine,
                character: startChar
            },
            end: {
                line: endLine,
                character: endChar
            }
        }
    }

    protected buildSeverityMap() {
        this._severityMap = new Map<string, DiagnosticSeverity>();
    }
    
    /**
     * Enable verbose output to the console from the linter
     * @param  {RemoteConsole} console The console to write to, i.e connection.console
     */
    enableConsole(console: RemoteConsole) {
        this._consoleEnabled = true;
        this._console = console;
    }
    
    /**
     * Show an error message.
     *
     * @param message The message to show.
     */
    protected error(message: string) {
        if (this._consoleEnabled) this._console.error(message);
    }
    
    /**
     * Show a warning message.
     *
     * @param message The message to show.
     */
    protected warn(message: string) {
        if (this._consoleEnabled) this._console.warn(message);
    }
    
    /**
     * Show an information message.
     *
     * @param message The message to show.
     */
    protected info(message: string) {
        if (this._consoleEnabled) this._console.info(message);
    }
    
    /**
     * Log a message.
     *
     * @param message The message to log.
     */
    protected log(message: string) {
        if (this._consoleEnabled) this._console.log(message);
    }
    
}
export interface MatchProperties {
    completeMatch: string,
    severityKey: string,
    line: number,
    column: number,
    message: string,
    object?: string,
    filepath?: string
}