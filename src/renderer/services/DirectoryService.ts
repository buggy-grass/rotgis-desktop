class DirectoryService{
    static async exist(path: string): Promise<boolean>{
        try {
            return await window.electronAPI.directoryExists(path);
        } catch (error) {
            return false;
        }
    }

    static async delete(path: string): Promise<boolean>{
        try {
            return await window.electronAPI.deleteFile(path);
        } catch (error) {
            return false;
        }
    }
}

export default DirectoryService;