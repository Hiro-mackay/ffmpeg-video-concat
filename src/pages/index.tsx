import dynamic from 'next/dynamic';

const Canvas = dynamic(() => import('../components/FFmpeg'), { ssr: false });

const Page = () => {
  return (
    <div>
      <main>
        <Canvas />
      </main>
    </div>
  );
};

export default Page;
