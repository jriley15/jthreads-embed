import React, { useState } from "react";

export default function CommentBody({ body }) {
  let formattedBody = "";
  let restOfBody = "";
  const [expanded, setExpanded] = useState(false);

  if (body.length > 500) {
    formattedBody = body.substring(0, 500);
    restOfBody = body.substring(500, body.length);
  }

  return (
    <>
      {body.length > 500 ? (
        <>
          {!expanded ? (
            <>
              {formattedBody}
              ..{" "}
              <a
                href=""
                onClick={e => {
                  setExpanded(true);
                  e.preventDefault();
                }}
              >
                Read more
              </a>
            </>
          ) : (
            <>
              {body}
              <a
                href=""
                onClick={e => {
                  setExpanded(false);
                  e.preventDefault();
                }}
              >
                {" "}
                Show less
              </a>
            </>
          )}
        </>
      ) : (
        body
      )}
    </>
  );
}
