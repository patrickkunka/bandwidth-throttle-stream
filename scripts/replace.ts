import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

/**
 * Replaces patterns in deno `lib` code to create tsc compatible `src` code
 */

const ROOT_PATH = path.resolve(__dirname, '..');
const SRC_PATH = path.join(ROOT_PATH, 'src');
const SRC_PATTERN = path.join(SRC_PATH, '**/*.ts');
const paths = glob.sync(SRC_PATTERN);

const replacements: [RegExp, string][] = [
    [/\.ts/g, ''],
    [/'[\./]+Platform\/[\w\.]+'/g, "'@Platform'"]
];

const replaced: string[] = paths
    .map((path: string) => fs.readFileSync(path, 'utf8'))
    .map((code: string) =>
        replacements.reduce(
            (code, [re, replacement]) => code.replace(re, replacement),
            code
        )
    );

replaced.forEach((code, i) => fs.writeFileSync(paths[i], code));
