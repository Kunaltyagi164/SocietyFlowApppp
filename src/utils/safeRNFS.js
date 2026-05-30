let nativeRNFS = null;

try {
  nativeRNFS = require('react-native-fs');
} catch (error) {
  console.warn('[safeRNFS] react-native-fs is unavailable:', error?.message || error);
}

const noopAsync = async () => {};
const falseAsync = async () => false;

const safeRNFS = nativeRNFS || {
  DocumentDirectoryPath: '',
  TemporaryDirectoryPath: '',
  DownloadDirectoryPath: '',
  ExternalStorageDirectoryPath: '',
  RNFSFileTypeRegular: 'file',
  exists: falseAsync,
  mkdir: noopAsync,
  copyFile: noopAsync,
  unlink: noopAsync,
  writeFile: noopAsync,
  downloadFile: () => ({
    promise: Promise.reject(new Error('react-native-fs native module is unavailable')),
  }),
};

export default safeRNFS;