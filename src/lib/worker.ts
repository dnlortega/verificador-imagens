import { checkImageFile } from './image-checker';

self.onmessage = async (e: MessageEvent) => {
  const file: File = e.data.file;
  const index: number = e.data.index;

  try {
    const result = await checkImageFile(file);
    self.postMessage({ type: 'SUCCESS', index, result });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', index, error: error.message });
  }
};
