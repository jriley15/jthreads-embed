import React, { useEffect, useRef, useState } from "react";

export default function Thread({ namespaceId, threadId }) {
  //?namespaceId=2&threadId=post-1&title=Post%201

  const [height, setHeight] = useState(500);
  const iframe = useRef();

  useEffect(() => {
    setInterval(() => {
      if (iframe.current) {
        let element = iframe.current.contentDocument.getElementById(
          "jthread-container"
        );
        if (element && height !== element.clientHeight + 16)
          setHeight(element.clientHeight + 16);
      }
    }, 500);
  }, []);

  return (
    <>
      <iframe
        title="JThreads"
        src={`http://localhost:3000/?namespaceId=${namespaceId}&threadId=${threadId}`}
        width="100%"
        allowTransparency="true"
        frameBorder="0"
        ref={iframe}
        scrolling="no"
        height={height}
        style={{
          overflow: "hidden"
        }}
      />
    </>
  );
}
