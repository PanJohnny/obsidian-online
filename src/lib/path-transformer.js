import { fetchData } from './github-utils';
import { fixForURL } from './string-utils';

export async function pathTransformer(user, repo, fileName) {
    const searchFile = async (path = "") => {
        const files = await fetchData(user, repo, path);
        for (const file of files) {
            if (file.type === "dir") {
                const result = await searchFile(file.path);
                if (result) return result;
            } else if (file.name === fileName || file.name === `${fileName}.md`) {
                return file.path;
            }
        }
        return null;
    };

    const filePath = await searchFile();
    if (!filePath) {
        throw new Error(`File ${fileName} not found in the repository ${repo}`);
    }

    return `/view?file=${fixForURL(filePath)}`;
}