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
            throw new Error(data.message);
        }
        return data;
    });
}