// This is a simplified service to handle Google Drive interactions.
// For a real production app, you would need a proper backend or a more robust client-side flow.

const CLIENT_ID = '462174468362-q22eqp43uflj9kapj1mf0krlst71ior1.apps.googleusercontent.com'; // User provided
const API_KEY = 'YOUR_API_KEY_HERE'; // Optional for some flows
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export const googleDriveService = {
    isAuthenticated: false,

    // Initialize Google Scripts
    loadScripts: (callback) => {
        const script1 = document.createElement('script');
        script1.src = "https://apis.google.com/js/api.js";
        script1.onload = () => {
            window.gapi.load('client', async () => {
                await window.gapi.client.init({
                    // apiKey: API_KEY, // Optional
                    discoveryDocs: DISCOVERY_DOCS,
                });
                gapiInited = true;
                if (gisInited) callback();
            });
        };
        document.body.appendChild(script1);

        const script2 = document.createElement('script');
        script2.src = "https://accounts.google.com/gsi/client";
        script2.onload = () => {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined later
            });
            gisInited = true;
            if (gapiInited) callback();
        };
        document.body.appendChild(script2);
    },

    // Sign In
    signIn: () => {
        return new Promise((resolve, reject) => {
            // SIMULATION MODE if no Client ID
            if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
                console.warn('Running in Simulation Mode (No Client ID)');
                setTimeout(() => {
                    googleDriveService.isAuthenticated = true;
                    resolve({ access_token: 'simulated_token' });
                }, 1000);
                return;
            }

            tokenClient.callback = async (resp) => {
                if (resp.error) {
                    reject(resp);
                }
                googleDriveService.isAuthenticated = true;
                resolve(resp);
            };

            if (window.gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    },

    // Sign Out
    signOut: () => {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token);
            window.gapi.client.setToken('');
            googleDriveService.isAuthenticated = false;
        }
    },

    // Find or Create Folder
    findOrCreateFolder: async (folderName) => {
        try {
            const accessToken = window.gapi.client.getToken().access_token;

            // 1. Search for folder
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
                { headers: { 'Authorization': 'Bearer ' + accessToken } }
            );
            const searchData = await searchResponse.json();

            if (searchData.files && searchData.files.length > 0) {
                return searchData.files[0].id;
            }

            // 2. Create folder if not exists
            const metadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            };

            const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            });
            const createData = await createResponse.json();
            return createData.id;

        } catch (error) {
            console.error('Error finding/creating folder:', error);
            throw error;
        }
    },

    // Upload File (Create or Update)
    uploadFile: async (fileName, content) => {
        // SIMULATION MODE
        if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
            console.log('Simulating Upload to Drive:', fileName);
            return new Promise(resolve => setTimeout(() => resolve({ id: 'simulated_file_id' }), 1500));
        }

        try {
            const folderId = await googleDriveService.findOrCreateFolder('ERP La Autentica');

            // Check if file exists in folder to update it instead of creating duplicate
            const accessToken = window.gapi.client.getToken().access_token;
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false`,
                { headers: { 'Authorization': 'Bearer ' + accessToken } }
            );
            const searchData = await searchResponse.json();

            const fileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

            const file = new Blob([JSON.stringify(content)], { type: 'application/json' });
            const metadata = {
                name: fileName,
                mimeType: 'application/json',
                parents: fileId ? [] : [folderId] // Only add parent on creation
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            let method = 'POST';

            if (fileId) {
                url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
                method = 'PATCH';
            }

            const response = await fetch(url, {
                method: method,
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form,
            });

            return await response.json();
        } catch (error) {
            console.error('Error uploading to Drive:', error);
            throw error;
        }
    },
    // Upload Binary File (Image/PDF)
    uploadBinaryFile: async (file, folderName, subfolderName) => {
        // SIMULATION MODE
        if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
            console.log('Simulating Binary Upload:', file.name);
            return new Promise(resolve => setTimeout(() => resolve({
                id: 'simulated_binary_id',
                webViewLink: 'https://via.placeholder.com/150'
            }), 2000));
        }

        try {
            // 1. Get Main Folder ID
            const mainFolderId = await googleDriveService.findOrCreateFolder(folderName);

            // 2. Get/Create Subfolder ID
            let parentId = mainFolderId;
            if (subfolderName) {
                // Find or create subfolder inside main folder
                const accessToken = window.gapi.client.getToken().access_token;
                const searchResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='${subfolderName}' and '${mainFolderId}' in parents and trashed=false`,
                    { headers: { 'Authorization': 'Bearer ' + accessToken } }
                );
                const searchData = await searchResponse.json();

                if (searchData.files && searchData.files.length > 0) {
                    parentId = searchData.files[0].id;
                } else {
                    // Create subfolder
                    const metadata = {
                        name: subfolderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [mainFolderId]
                    };
                    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + accessToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(metadata)
                    });
                    const createData = await createResponse.json();
                    parentId = createData.id;
                }
            }

            // 3. Upload File
            const metadata = {
                name: file.name,
                mimeType: file.type,
                parents: [parentId]
            };

            const accessToken = window.gapi.client.getToken().access_token;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                body: form,
            });

            return await response.json();
        } catch (error) {
            console.error('Error uploading binary to Drive:', error);
            throw error;
        }
    },

    // Find File by Name
    findFile: async (fileName) => {
        try {
            const accessToken = window.gapi.client.getToken().access_token;
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false`,
                { headers: { 'Authorization': 'Bearer ' + accessToken } }
            );
            const searchData = await searchResponse.json();
            if (searchData.files && searchData.files.length > 0) {
                return searchData.files[0].id;
            }
            return null;
        } catch (error) {
            console.error('Error finding file:', error);
            throw error;
        }
    },

    // Download File Content (JSON)
    downloadFile: async (fileId) => {
        try {
            const accessToken = window.gapi.client.getToken().access_token;
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                { headers: { 'Authorization': 'Bearer ' + accessToken } }
            );
            return await response.json();
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }
};
