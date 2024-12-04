export function fetchData(user, repo, path = "") {
    const token = import.meta.env.GITHUB_TOKEN;
    if (path == null) {
        path = "";
    }
    console.log(user + " " + repo + " " + path);
    return fetch(`https://api.github.com/repos/${user}/${repo}/contents/${path}`, {
        headers: {
            'Authorization': `token ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            throw new Error(JSON.stringify(data));
        }
        return data;
    });
}

export function fetchFile(url) {
    const token = import.meta.env.GITHUB_TOKEN;
    if (!url.startsWith("https://api.github.com") || url.includes("..")) {
        throw new Error("Invalid URL");
    }
    return fetch(url, {
        headers: {
            'Authorization': `token ${token}`
        }
    }).then(response => response.json());
}

export function fetchRepoTree(user, repo) {
    const token = import.meta.env.GITHUB_TOKEN;
    return fetch(`https://api.github.com/repos/${user}/${repo}/git/trees/main?recursive=1`, {
        headers: {
            'Authorization': `token ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            throw new Error(JSON.stringify(data));
        }
        return data.tree;
    });
}