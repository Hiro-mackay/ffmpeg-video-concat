import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { useState } from 'react';

export const Canvas = () => {
  const [ref, setRef] = useState('');
  const ffmpeg = createFFmpeg({ log: true });
  const transcode = async ({ target: { files } }) => {
    console.log("Convert!")
    const { name } = files[0];
    await ffmpeg.load();
    ffmpeg.FS('writeFile', name, await fetchFile(files[0]));
    await ffmpeg.run('-i', name, 'output.mp4');
    const data = ffmpeg.FS('readFile', 'output.mp4');
    const src = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
    setRef(src);
  };

  return (
    <div>
      <input type="file" onChange={transcode} />
      <video src={ref} controls></video>
    </div>
  );
};

export default Canvas;
