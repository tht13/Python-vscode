"use strict";
import 'process';
import fs = require('fs');

/**
 * Takes a uri path and fixes it to be a file path
 * * Removes 'file://'
 * * Converts C%3A/ -> C:\\
 * @param  {string} path
 * @returns string
 */
export function fixPath(path: string): string {
    if (/^win/.test(process.platform)) {
        path = path.replace('file:///', '').replace('%3A', ':').replace(/\//g, '\\');
    } else {
        path = path.replace('file://', '');
    }
    return path;
}

/**
 * Validates that the provided path is a actual file
 * @param  {string} path The path to validate
 * @returns boolean
 */
export function validatePath(path: string): boolean {
    try {
        if (path === "" || path === null || path === undefined) {
            return false;
        }
        fs.accessSync(path, fs.F_OK);
        return true;
    } catch(e) {
        return false;
    }
}
