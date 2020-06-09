import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';

/**
 * Replaces patterns in deno `lib` code to create tsc compatible `src` code
 */

const ROOT_PATH = path.resolve(__dirname, '..');
const SRC_PATH = path.join(ROOT_PATH, 'src');
const SRC_PATTERN = path.join(SRC_PATH, '**/*.ts');
const paths = glob.sync(SRC_PATTERN);

const replacements: Array<[RegExp, string]> = [
    [/\.ts/g, ''], // remove all `.ts` file extensions
    [/'[\./]+Platform\/[\w\.]+'/g, '"@Platform"'] // replace all references to the deno platform entry point with alias
];

const replaced: string[] = paths
    .map((modulePath: string) => fs.readFileSync(modulePath, 'utf8'))
    .map((code: string) =>
        replacements.reduce(
            (codeUnderReplacement, [re, replacement]) =>
                codeUnderReplacement.replace(re, replacement),
            code
        )
    );

replaced.forEach((code, i) => fs.writeFileSync(paths[i], code));
