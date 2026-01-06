class WindowsAPI {
    static async generateShortPath(filePath: string) {
        return await window.electronAPI.getShortPath(filePath);
    }
}

export default WindowsAPI;