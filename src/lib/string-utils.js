export function fixForURL(str) {
    return encodeURIComponent(str.replace(".", "\u0000"));
}

export function fixForURLDecode(str) {
    return decodeURIComponent(str).replace("\u0000", ".");
}