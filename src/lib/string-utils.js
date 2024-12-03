export function fixForURL(str) {
    if (!str)
        return str;
    return encodeURIComponent(str.replace(".", "\u0000"));
}

export function fixForURLDecode(str) {
    if (!str)
        return str;
    return decodeURIComponent(str).replace("\u0000", ".");
}