interface VideoProps {
  src: string;
  title?: string;
  caption?: string;
}

export function Video({ src, title, caption }: VideoProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <figure className="my-8 not-prose">
      <div className="rounded-lg overflow-hidden border border-slate-200 bg-black">
        <video
          controls
          preload="metadata"
          className="w-full"
          title={title}
        >
          <source src={`${basePath}${src}`} type="video/mp4" />
          お使いのブラウザは動画再生に対応していません。
        </video>
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-slate-500 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
