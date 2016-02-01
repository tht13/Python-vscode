import { RemoteConsole, Diagnostic, 
    DiagnosticSeverity, Range, 
    ITextDocument } from 'vscode-languageserver';
import { fixPath, validatePath } from './../utils';

export class BaseLinter {
    protected _target: string;
    protected _args: string[];
    protected _filepath: string;
    protected _documentText: string[];
    protected _regexMatch: RegExp;
    protected _severityMap: Map<string, DiagnosticSeverity>;
    private _consoleEnabled: boolean = false;
    private _console: RemoteConsole;

    constructor(target: string, args: string[] = []) {
        this._target = target;
        this._args = args;
        this.buildSeverityMap();
    };
    
    /**
     * Get the command line string to run for the file
     * @returns string
     */
    getCmd(): string {
        if (this.validateFilepath(this._filepath)) {
            let cmd: string[] = [this._target, ...this._args, this._filepath];
            return cmd.join(" ");
        }
    }

    getRegex(): RegExp {
        return this._regexMatch;
    }
    
    /**
     * Set the RegExp to use to parse lint results
     * @throws {EvalError} Thrown when the input pattern is invalid
     * @param  {string} pattern The regular expression patter
     * @param  {string=""} flags A string of character flags (igm) to use in the RegExp, Defaults to none
     */
    setRegex(pattern: string, flags: string = "") {
        try {
            let regExp = new RegExp(pattern, flags);
            this._regexMatch = regExp;
        } catch (e) {
            this.warn(e.toString());
            throw new EvalError();
        }
    }

    setDocument(doc: ITextDocument) {
        let path = fixPath(doc.uri);
        if (this.validateFilepath(path)) this._filepath = path;
        this._documentText = doc.getText().split(/\r?\n/g);
        this.log(`Loaded document: ${this._filepath}`);
    }

    getFilepath(): string {
        return this._filepath;
    }
    
    //TODO: handle thrown ReferenceError in function references 
    private validateFilepath(path): boolean {
        if (!validatePath(path)) {
            throw new ReferenceError();
        }
        return true;
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