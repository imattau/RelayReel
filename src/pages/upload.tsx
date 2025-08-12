import { useState } from 'react';
import useUploadVideo from '@/features/upload/useUploadVideo';

export default function UploadPage() {
  const { selectFile, previewUrl, upload, error, reset, inputProps } = useUploadVideo();
  const [caption, setCaption] = useState('');
  const [creator, setCreator] = useState('');

  const handleFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    selectFile(file);
  };

  const submit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await upload(creator, caption);
    setCaption('');
    setCreator('');
    reset();
  };

  return (
    <div className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Creator pubkey"
          className="border p-2"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
        />
        <input
          type="text"
          placeholder="Caption"
          className="border p-2"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <input type="file" className="border p-2" onChange={handleFile} {...inputProps} />
        {previewUrl && (
          <video src={previewUrl} controls className="w-full" />
        )}
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" className="bg-blue-500 text-white p-2" disabled={!previewUrl}>
          Upload
        </button>
      </form>
    </div>
  );
}
