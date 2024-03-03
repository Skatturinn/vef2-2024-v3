import {
	readFile as fsReadFile,
	writeFile as fsWriteFile,
	mkdir,
	readdir,
	stat
} from 'fs/promises';
import { join, parse } from 'path';

export async function direxists(dir: string) {
	if (!dir) {
		return false;
	}

	try {
		const info = await stat(dir);
		return info.isDirectory();
	} catch (e) {
		return false;
	}
}

export async function createDirIfNotExists(dir: string) {
	if (!(await direxists(dir))) {
		await mkdir(dir);
	}
}

export async function readFilesFromDir(dir: string): Promise<Array<string>> {
	let files = [];
	try {
		files = await readdir(dir);
	} catch (e) {
		return [];
	}

	const mapped = files.map(async (file) => {
		const path = join(dir, file);
		const info = await stat(path);

		if (info.isDirectory()) {
			return null;
		}

		if (info.isFile()) {
			return path;
		}

		return null;
	});

	const resolved = await Promise.all(mapped);
	// Remove any directories that will be represented by `null`
	const filtered = [];
	for (const file of resolved) {
		if (file) {
			filtered.push(file);
		}
	}
	return filtered;
}

export async function readFile(file: string, encoding: BufferEncoding = 'utf8'): Promise<string | null> {
	try {
		const content = await fsReadFile(file, { encoding });
		return content.toString();
	} catch {
		return null;
	}
}

export async function writeFile(filePathString: string, fileConentString: string): Promise<void> {
	const { dir } = parse(filePathString);
	if (await direxists(dir)) {
		await fsWriteFile(filePathString, fileConentString)
	} else {
		throw new Error('directory does not exist.')
	}
}