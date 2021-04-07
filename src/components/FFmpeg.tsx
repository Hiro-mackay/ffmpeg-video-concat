import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { ChangeEvent, memo, useState } from 'react';

interface Assets {
  ref: string;
  file: File;
  video: HTMLVideoElement;
}

const ts2sec = (ts) => {
  const [h, m, s] = ts.split(':');
  return parseFloat(h) * 60 * 60 + parseFloat(m) * 60 + parseFloat(s);
};

let duration = 0;

const inProgress = (message, progress) => {
  if (typeof message === 'string') {
    if (message.startsWith('frame') || message.startsWith('size')) {
      const ts = message.split('time=')[1].split(' ')[0];
      const t = ts2sec(ts);
      progress({ ratio: t / duration });
    } else if (message.startsWith('video:')) {
      progress({ ratio: 1 });
      duration = 0;
    }
  }
};
// Video Elementを作成し、video pathを読み込ませる
const createVideoRef = (pathVideoRef: string) => {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.preload = '';
  video.src = pathVideoRef;
  return video;
};

// ファイルからpathを生成する
const createVideoPath = (file: File) => URL.createObjectURL(file);

// ファイルからVideoElementを生成する
const createVideoElement = (file: File) => {
  const path = createVideoPath(file);
  return createVideoRef(path);
};

const createVideo = async (file: File): Promise<HTMLVideoElement> => {
  const video = createVideoElement(file);

  return new Promise((resolve, reject) => {
    video
      .play()
      .then(() => {
        video.pause();
        resolve(video);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const Canvas = memo(() => {
  const [ref, setRef] = useState('');
  const [files, setFiles] = useState<Assets[]>([]);
  const [err, setErr] = useState<Error>(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const dlFn = () => {
    const element = document.createElement('a');
    element.setAttribute('href', ref);
    element.setAttribute('download', ref);

    element.style.display = ' none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const _setProgress = ({ ratio }: { ratio: number }) => {
    setProgress(ratio);
  };

  const ffmpeg = createFFmpeg({
    logger: ({ message }) => {
      inProgress(message, _setProgress);
      console.log(message);
    },
    progress: ({ ratio }) => {
      const r = `Complete: ${(ratio * 100.0).toFixed(2)}%`;
    }
  });

  const reader = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files.item(0);
    const fileRef = `file '${f.name}'`;
    const videoElement = await createVideo(f);

    const asset = {
      ref: fileRef,
      file: f,
      video: videoElement
    };

    setFiles([...files, asset]);
  };

  const concat = async () => {
    try {
      if (!files.length) {
        throw new Error('Not set some files');
      }

      await ffmpeg.load();

      const inputPath: string[] = [];

      for (const asset of files) {
        const { name } = asset.file;
        ffmpeg.FS('writeFile', name, await fetchFile(asset.file));
        duration += asset.video.duration;
        inputPath.push(asset.ref);
      }

      setMessage('Concat start');

      const cancat = inputPath.join('\n');

      const concatList = new TextEncoder().encode(cancat);

      ffmpeg.FS('writeFile', 'concat.txt', concatList);

      await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'concat.txt', '-c', 'copy', 'output.MOV');
      const data = ffmpeg.FS('readFile', 'output.MOV');
      const src = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

      setRef(src);
      setMessage('Completed concat');
    } catch (error) {
      setErr(error);
    }
  };

  return (
    <div>
      <video src={ref} width={800} controls></video>
      <div>
        <input type="file" onChange={reader} />
        <input type="button" value="Concat" onClick={concat} />
      </div>
      {ref && (
        <div>
          <button onClick={dlFn}>ダウンロード</button>
        </div>
      )}

      <p style={{ color: 'red' }}>{err?.message}</p>
      <p>進捗: {(progress * 100).toFixed(0)}%</p>
      <ul>
        {files.map((file) => (
          <li key={file.file.name}>{file.file.name}</li>
        ))}
      </ul>
    </div>
  );
});

export default Canvas;
