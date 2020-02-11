import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import queryString from "query-string";
import {
  Button,
  Comment,
  Form,
  Header,
  Icon,
  Placeholder,
  Divider,
  CommentAvatar,
  Pagination,
  List,
  Image,
  Container,
  Dimmer,
  Segment,
  Dropdown,
  Label
} from "semantic-ui-react";
import useApi from "../hooks/useApi";
import useAuth from "../hooks/useAuth";
import config from "../util/config";

const commentsPerPage = 10;

export default function Thread() {
  const location = useLocation();
  let { namespaceId, threadId: threadIdentifier, title } = queryString.parse(
    location.search
  );
  const { post, get } = useApi();
  const { claims, isAuthenticated, login, logout } = useAuth();
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [threadId, setThreadId] = useState("");
  const [page, setPage] = useState(0);
  const [thread, setThread] = useState({});
  const [pagesLoaded, setPagesLoaded] = useState([]);
  const [pages, setPages] = useState([]);
  const [newComment, setNewComment] = useState(0);
  const containerRef = useRef();
  const [loading, setLoading] = useState(true);
  const [outerHeight, setOuterHeight] = useState(0);
  const [outerWidth, setOuterWidth] = useState(0);
  const [screenY, setScreenY] = useState(0);
  const [screenX, setScreenX] = useState(0);

  const init = async () => {
    let response = await post("/Thread/Init", {
      namespaceId: namespaceId,
      identifier: threadIdentifier
    });
    if (!response.success) return;
    setThread(response.data);

    setThreadId(response.data.threadId);
    response = await get("/Comment/Search", {
      threadId: response.data.threadId
    });
    if (response.success) {
      setComments(response.data);
      setPagesLoaded([0]);

      setPages([response.data]);
    }
    setLoading(false);
  };

  useEffect(() => {
    window.addEventListener("message", ({ data, origin }) => {
      if (origin === config.landing) {
        if (data.token) login(data.token);
      }
      if (data.outerHeight) setOuterHeight(outerHeight);
      if (data.outerWidth) setOuterWidth(outerHeight);
      if (data.screenY) setScreenY(screenY);
      if (data.screenX) setScreenX(screenX);

      console.log(data);
    });

    return () => {
      window.removeEventListener("message");
    };
  }, []);

  useEffect(() => {
    init();
  }, [namespaceId, threadIdentifier]);

  useEffect(() => {
    setComments(pages[page]);
    updateHeight();
  }, [pages, page]);

  useEffect(() => {
    updateHeight();
  }, [comments]);

  const updateHeight = () => {
    window.parent.postMessage(
      { height: containerRef.current.clientHeight },
      "*"
    );
  };

  const handleCommentChange = e => {
    setComment(e.target.value);
  };

  const handleSendComment = async () => {
    if (!comment) {
      return;
    }
    let tempComment = comment;
    setComment("");
    let response = await post("/Comment/Create", {
      threadId: threadId,
      namespaceId: namespaceId,
      body: tempComment
    });

    if (response.success) {
      //init();
      /*handlePageChange(null, {
        activePage: Math.ceil((thread.comments + 1) / commentsPerPage)
      });*/
      setNewComment(response.data.commentId);
      let newPage = Math.ceil((thread.comments + 1) / commentsPerPage);
      setThread({
        ...thread,
        comments: thread.comments + 1,
        totalComments: thread.totalComments + 1
      });

      response = await get("/Comment/Search", {
        threadId: threadId,
        index: newPage - 1
      });
      if (response.success) {
        setComments([...comments, ...response.data]);
        setPagesLoaded([...pagesLoaded, newPage - 1]);

        let tempPages = [...pages];
        tempPages[newPage - 1] = response.data;
        setPages(tempPages);

        setPage(newPage - 1);
      }
    }
  };

  const handleLikeComment = commentId => async e => {
    let response = await post("/Comment/Rate", {
      type: 1,
      commentId: commentId
    });
    if (response.success) init();
  };

  const handleDislikeComment = commentId => async e => {
    let response = await post("/Comment/Rate", {
      type: 0,
      commentId: commentId
    });
    if (response.success) init();
  };

  const handleShowCommentReply = index => e => {
    let tempComments = [...comments];
    let tempComment = { ...comments[index] };
    tempComments.forEach(comment => {
      if (comment.replying) comment.replying = false;
      comment.replies.forEach(reply => {
        if (reply.replying) reply.replying = false;
      });
    });
    if (tempComment.replying) {
      tempComments[index].replying = false;
    } else {
      tempComments[index].replying = true;
    }
    setComments(tempComments);
  };
  const handleShowCommentReplyResponse = (commentIndex, replyIndex) => e => {
    let tempComments = [...comments];
    let tempComment = { ...comments[commentIndex].replies[replyIndex] };
    tempComments.forEach(comment => {
      if (comment.replying) comment.replying = false;
      comment.replies.forEach(reply => {
        if (reply.replying) reply.replying = false;
      });
    });
    if (tempComment.replying) {
      tempComments[commentIndex].replies[replyIndex].replying = false;
    } else {
      tempComments[commentIndex].replies[replyIndex].replying = true;
    }
    setComments(tempComments);
  };

  const getDateString = date => {
    let convertedDate = new Date(date + "Z");
    let now = new Date();

    if (convertedDate.getDay() == now.getDay()) {
      let time = convertedDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      if (time.startsWith("0")) time = time.substring(1, time.length);
      return "Today at " + time;
    }
    return convertedDate.toLocaleDateString();
  };

  const handleCommentReplyChange = index => e => {
    let tempComments = [...comments];
    tempComments[index].reply = e.target.value;
    setComments(tempComments);
  };

  const handleSendReply = index => async e => {
    if (!comments[index].reply) return;

    let tempComments = [...comments];
    let response = await post("/Comment/Create", {
      threadId: threadId,
      namespaceId: namespaceId,
      parentCommentId: comments[index].commentId,
      body: comments[index].reply
    });
    tempComments[index].reply = "";
    tempComments[index].replying = false;
    setComments(tempComments);
    setNewComment(response.data.commentId);
    if (response.success) {
      response = await get("/Comment/Search", {
        threadId: threadId,
        index: page
      });
      if (response.success) {
        response.data[index].showReplies = true;

        setComments([...response.data]);

        let tempPages = [...pages];
        tempPages[page] = response.data;
        setPages(tempPages);
      }
    }
  };

  const handleCommentReplyResponseChange = (commentIndex, replyIndex) => e => {
    let tempComments = [...comments];
    tempComments[commentIndex].replies[replyIndex].reply = e.target.value;
    setComments(tempComments);
  };

  const handleSendReplyResponse = (commentIndex, replyIndex) => async e => {
    if (!comments[commentIndex].replies[replyIndex].reply) return;
    console.log(commentIndex, replyIndex);
    let tempComments = [...comments];
    let response = await post("/Comment/Create", {
      threadId: threadId,
      namespaceId: namespaceId,
      parentCommentId: comments[commentIndex].commentId,
      body: comments[commentIndex].replies[replyIndex].reply
    });
    tempComments[commentIndex].replies[replyIndex].reply = "";
    tempComments[commentIndex].replies[replyIndex].replying = false;
    setComments(tempComments);

    setNewComment(response.data.commentId);
    if (response.success) {
      response = await get("/Comment/Search", {
        threadId: threadId,
        index: page
      });
      if (response.success) {
        response.data[commentIndex].showReplies = true;

        setComments([...response.data]);

        let tempPages = [...pages];
        tempPages[page] = response.data;
        setPages(tempPages);
      }
    }
  };

  const handleClickAway = () => {
    /*let tempComments = [...comments];
    tempComments.forEach(comment => {
      if (comment.replying) comment.replying = false;
      comment.replies.forEach(reply => {
        if (reply.replying) reply.replying = false;
      });
    });
    setComments(tempComments);*/
  };

  const handleActionsClicked = e => {
    //e.stopPropagation();
  };

  const handleCollapseReplies = commentIndex => e => {
    let tempComments = [...comments];
    tempComments[commentIndex].showReplies = !tempComments[commentIndex]
      .showReplies;
    setComments(tempComments);
  };

  const handlePageChange = async (e, { activePage }) => {
    setPage(activePage - 1);

    if (!pagesLoaded.includes(activePage - 1)) {
      let response = await get("/Comment/Search", {
        threadId: threadId,
        index: activePage - 1
      });
      if (response.success) {
        setComments([...comments, ...response.data]);
        setPagesLoaded([...pagesLoaded, activePage - 1]);

        let tempPages = [...pages];
        tempPages[activePage - 1] = response.data;
        setPages(tempPages);
      }
    }
  };

  const handleOpenNormalSignIn = () => {
    let w = 400;
    let h = 500;
    const y =
      (outerHeight || window.top.outerHeight) / 2 +
      (screenY || window.top.screenY) -
      h / 2;
    const x =
      (outerWidth || window.top.outerWidth) / 2 +
      (screenX || window.top.screenX) -
      w / 2;
    window.open(
      config.landing + "/login",
      "Login",
      "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=yes, copyhistory=no, width=" +
        w +
        ", height=" +
        h +
        ", top=" +
        y +
        ", left=" +
        x
    );
  };

  return (
    <div id="jthread-container" onClick={handleClickAway} ref={containerRef}>
      <Comment.Group style={{ maxWidth: "100%" }} size="large">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Header as="h3" color="grey">
              <Icon name="comments" />
              {thread?.totalComments || 0} comments
            </Header>
          </div>
          <div>
            {isAuthenticated ? (
              <Dropdown
                direction="left"
                text={<List.Header as="h3">{claims.name}</List.Header>}
              >
                <Dropdown.Menu>
                  <Dropdown.Item text="Profile" icon="user" />
                  <Dropdown.Item
                    onClick={() => {
                      logout();
                    }}
                    text="Logout"
                    icon="close"
                  />
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <List horizontal>
                <List.Item>
                  <Dropdown
                    direction="left"
                    text={<List.Header as="h3">Login</List.Header>}
                  >
                    <Dropdown.Menu>
                      <Dropdown.Item
                        text="With JThreads"
                        onClick={handleOpenNormalSignIn}
                      />
                      <Dropdown.Item
                        text={
                          <span
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <img
                              style={{
                                width: "1em",
                                marginRight: 11,
                                marginLeft: 2
                              }}
                              src="https://cdn.aircomechanical.com/wp-content/uploads/2018/12/google-review-button.png"
                            />{" "}
                            Google
                          </span>
                        }
                      />
                      <Dropdown.Item text="Facebook" icon="facebook blue" />
                      <Dropdown.Item text="Twitter" icon="twitter blue" />
                    </Dropdown.Menu>
                  </Dropdown>
                </List.Item>
              </List>
            )}
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 16 }}>
          <Comment>
            <Comment.Avatar src="https://bestnycacupuncturist.com/wp-content/uploads/2016/11/anonymous-avatar-sm.jpg" />
          </Comment>
          <Form reply style={{ marginLeft: 16, width: "100%" }}>
            <Form.TextArea
              value={comment}
              onChange={handleCommentChange}
              placeholder={"Leave a comment"}
              disabled={!isAuthenticated}
              rows={2}
              style={{ height: 70, width: "100%" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                flexDirection: isAuthenticated ? "row" : "column-reverse"
              }}
            >
              {isAuthenticated ? (
                <Button
                  content="Add Comment"
                  labelPosition="left"
                  icon="edit"
                  primary
                  onClick={handleSendComment}
                />
              ) : (
                <Container textAlign="center" style={{ paddingTop: 16 }}>
                  <Header as="h4">
                    Sign up{" "}
                    <a href={config.landing + "?register=true"} target="_blank">
                      here
                    </a>{" "}
                    to comment
                  </Header>
                  <Header as="h5" color="grey" style={{ marginTop: 0 }}>
                    Or sign in with
                  </Header>
                  <div>
                    <Button
                      circular
                      color="facebook"
                      icon="facebook"
                      size="large"
                    />
                    <Button
                      circular
                      color="twitter"
                      icon="twitter"
                      size="large"
                    />
                    <Button circular icon size="large">
                      <img
                        style={{ width: "1.1em" }}
                        src="https://cdn.aircomechanical.com/wp-content/uploads/2018/12/google-review-button.png"
                      />
                    </Button>
                  </div>
                </Container>
              )}
              <div>
                <Button as="div" labelPosition="right">
                  <Button color="red" disabled={!isAuthenticated}>
                    <Icon name="heart" />
                    Like
                  </Button>
                  <Label as="a" basic color="red" pointing="left">
                    2,048
                  </Label>
                </Button>

                <Button labelPosition="left" content="Share" icon="share" />
              </div>
            </div>
          </Form>
        </div>

        {loading ? (
          <Placeholder style={{ marginTop: 16 }}>
            <Placeholder.Header image>
              <Placeholder.Line />
              <Placeholder.Line />
            </Placeholder.Header>
            <Placeholder.Paragraph>
              <Placeholder.Line />
              <Placeholder.Line />
              <Placeholder.Line />
              <Placeholder.Line />
            </Placeholder.Paragraph>
            <Placeholder.Header image>
              <Placeholder.Line />
              <Placeholder.Line />
            </Placeholder.Header>
            <Placeholder.Paragraph>
              <Placeholder.Line />
              <Placeholder.Line />
              <Placeholder.Line />
              <Placeholder.Line />
            </Placeholder.Paragraph>
          </Placeholder>
        ) : pages[page]?.length > 0 ? (
          <>
            {comments.map((comment, commentIndex) => (
              <Comment
                key={comment.commentId}
                style={{
                  marginBottom: "1rem",
                  marginTop: "1rem",
                  backgroundColor:
                    comment.commentId === newComment
                      ? "rgba( 250, 223, 173, 0.2)"
                      : "inherit",
                  borderRadius: 10
                }}
              >
                <Comment.Avatar src="https://bestnycacupuncturist.com/wp-content/uploads/2016/11/anonymous-avatar-sm.jpg" />
                <Comment.Content>
                  <Comment.Author as="a">
                    {comment.user?.displayName}
                  </Comment.Author>
                  <span style={{ paddingLeft: 8, color: "rgba(0,0,0,.4)" }}>
                    ·
                  </span>
                  <Comment.Metadata>
                    {getDateString(comment.createdOn)}
                  </Comment.Metadata>
                  <Comment.Text>{comment.body}</Comment.Text>
                  <Comment.Actions onClick={handleActionsClicked}>
                    <Comment.Action
                      onClick={handleShowCommentReply(commentIndex)}
                    >
                      Reply
                    </Comment.Action>
                    <Comment.Action>|</Comment.Action>
                    <Comment.Action>
                      <span style={{ color: "#2185d0", paddingRight: 4 }}>
                        {comment.likes}
                      </span>
                      <Icon
                        name="thumbs up"
                        onClick={handleLikeComment(comment.commentId)}
                      />
                    </Comment.Action>
                    <Comment.Action>
                      <span style={{ color: "red", paddingRight: 4 }}>
                        {comment.dislikes}
                      </span>

                      <Icon
                        name="thumbs down"
                        onClick={handleDislikeComment(comment.commentId)}
                      />
                    </Comment.Action>
                    <Comment.Action>|</Comment.Action>
                    {comment.replies.length > 0 && (
                      <Comment.Action
                        onClick={handleCollapseReplies(commentIndex)}
                      >
                        <Icon
                          name={comment.showReplies ? "caret up" : "caret down"}
                        />
                        {comment.replies.length +
                          (comment.replies.length > 1 ? " replies" : " reply")}
                      </Comment.Action>
                    )}
                    {comment.replying && (
                      <Form style={{ paddingTop: 8 }}>
                        <Form.Field width={12}>
                          <input
                            placeholder="Reply"
                            autoFocus
                            value={comment.reply || ""}
                            onChange={handleCommentReplyChange(commentIndex)}
                          />
                        </Form.Field>
                        <Form.Field
                          control={Button}
                          size="small"
                          onClick={handleSendReply(commentIndex)}
                        >
                          Send
                        </Form.Field>
                      </Form>
                    )}
                  </Comment.Actions>
                </Comment.Content>
                {comment.showReplies && comment.replies?.length > 0 && (
                  <Comment.Group size="large">
                    {comment.replies.map((reply, replyIndex) => (
                      <Comment
                        key={reply.commentId}
                        style={{
                          marginTop: "1rem",
                          marginBottom: "1rem",
                          backgroundColor:
                            reply.commentId === newComment
                              ? "rgba( 250, 223, 173, 0.2)"
                              : "inherit"
                        }}
                      >
                        <Comment.Avatar src="https://react.semantic-ui.com/images/avatar/small/jenny.jpg" />
                        <Comment.Content>
                          <Comment.Author as="a">
                            {reply.user?.displayName}
                          </Comment.Author>
                          <span style={{ paddingLeft: 8 }}>·</span>
                          <Comment.Metadata>
                            <div>Just now</div>
                          </Comment.Metadata>
                          <Comment.Text>{reply.body}</Comment.Text>
                          <Comment.Actions onClick={handleActionsClicked}>
                            <Comment.Action
                              onClick={handleShowCommentReplyResponse(
                                commentIndex,
                                replyIndex
                              )}
                            >
                              Reply
                            </Comment.Action>
                            {reply.replying && (
                              <Form style={{ paddingTop: 8 }}>
                                <Form.Field width={12}>
                                  <input
                                    placeholder="Reply"
                                    autoFocus
                                    value={
                                      reply.reply ||
                                      "@" + reply.user.displayName + " "
                                    }
                                    onChange={handleCommentReplyResponseChange(
                                      commentIndex,
                                      replyIndex
                                    )}
                                  />
                                </Form.Field>
                                <Form.Field
                                  control={Button}
                                  size="small"
                                  onClick={handleSendReplyResponse(
                                    commentIndex,
                                    replyIndex
                                  )}
                                >
                                  Send
                                </Form.Field>
                              </Form>
                            )}
                          </Comment.Actions>
                        </Comment.Content>
                      </Comment>
                    ))}
                  </Comment.Group>
                )}
              </Comment>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 32
              }}
            >
              <Pagination
                totalPages={Math.ceil(thread.comments / commentsPerPage)}
                activePage={page + 1}
                onPageChange={handlePageChange}
              ></Pagination>
            </div>
          </>
        ) : (
          <div>
            <Divider hidden />
            <Header size="small" style={{ textAlign: "center" }}>
              No comments yet
            </Header>
          </div>
        )}
      </Comment.Group>
    </div>
  );
}
