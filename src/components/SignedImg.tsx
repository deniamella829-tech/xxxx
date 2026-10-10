import type { ImgHTMLAttributes } from "react";
import { useSignedMediaUrl } from "@/lib/media";

// <img> that resolves private storage URLs into temporary signed URLs.
const SignedImg = ({ src, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src?: string | null }) => {
  const url = useSignedMediaUrl(src ?? "");
  if (!url) return <span className={rest.className} />;
  return <img src={url} {...rest} />;
};

export default SignedImg;
