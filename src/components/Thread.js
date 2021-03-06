import React, {
  useEffect,
  useState,
  useRef,
} from "react";
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
  Pagination,
  List,
  Container,
  Dropdown,
  Label
} from "semantic-ui-react";
import useApi from "../hooks/useApi";
import useAuth from "../hooks/useAuth";
import config from "../util/config";
import CommentBody from "./CommentBody";
import GoogleLogin from "react-google-login";
import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";
import "../assets/index.css";

const commentsPerPage = 10;

export default function Thread() {
  const location = useLocation();
  let {
    namespaceId,
    threadId: threadIdentifier,
    backgroundColor
  } = queryString.parse(location.search);
  const { post, get, postFormData } = useApi();
  const { claims, isAuthenticated, login, logout } = useAuth();
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [page, setPage] = useState(0);
  const [thread, setThread] = useState({});
  const [pagesLoaded, setPagesLoaded] = useState([]);
  const [pages, setPages] = useState([]);
  const [newComment, setNewComment] = useState(0);
  const containerRef = useRef();
  const [loading, setLoading] = useState(true);
  const [outerHeight, setOuterHeight] = useState(-1);
  const [outerWidth, setOuterWidth] = useState(-1);
  const [screenY, setScreenY] = useState(-1);
  const [screenX, setScreenX] = useState(-1);
  const [selectedSort, setSelectedSort] = useState(0);
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState("");

  const observer = React.useRef(
    new ResizeObserver(entries => {
      // Only care about the first element, we expect one element ot be watched
      const { height } = entries[0].contentRect;
      window.parent.postMessage({ height: height }, "*");
    })
  );

  const init = async () => {
    let response = await post("/Thread/Init", {
      namespaceId: namespaceId,
      identifier: threadIdentifier
    });
    if (!response.success) return;
    setThread(response.data);

    setThreadId(response.data.threadId);
    response = await get("/Comment/Search", {
      threadId: response.data.threadId,
      sortType: selectedSort
    });
    if (response.success) {
      setComments(response.data);
      setPagesLoaded([0]);
      setPages([response.data]);
      setPage(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    window.addEventListener("message", async ({ data, origin }) => {
      if (origin === config.landing) if (data.token) login(data.token);

      if (typeof data.outerHeight !== "undefined")
        setOuterHeight(data.outerHeight);
      if (typeof data.outerWidth !== "undefined")
        setOuterWidth(data.outerWidth);
      if (typeof data.screenY !== "undefined") setScreenY(data.screenY);
      if (typeof data.screenX !== "undefined") setScreenX(data.screenX);

      if (data.imageData) {
        //make sure we're expecting an avatar change

        let formData = new FormData();
        formData.append("imageFile", data.imageData);
        let response = await postFormData("/User/UploadAndSetAvatar", formData);
        if (response.success) {
          window.parent.postMessage({ success: true }, "*");
          setAvatar(response.data);
        }
      } else if (data.imageUrl) {
        //make sure we're expecting an avatar change

        //hit api endpoint to update avatar url
        let response = await post("/User/SetAvatar", {
          imageUrl: data.imageUrl
        });
        if (response.success) {
          setAvatar(data.imageUrl);
          window.parent.postMessage({ success: true }, "*");
        }
      }
    });
    observer.current.observe(containerRef.current);

    return () => {
      window.removeEventListener("message");
      observer.current.unobserve();
    };
  }, []);

  //super hacky shit for updating the users avatar in all existing comments
  useEffect(() => {
    if (avatar) {
      setUser(user => {
        let userCopy = { ...user, avatarUrl: avatar };
        setPages(pages => {
          let pagesCopy = [...pages];
          pagesCopy.forEach(page => {
            page.forEach(comment => {
              if (
                comment.user?.id === userCopy.id &&
                comment.user?.avatarUrl !== userCopy.avatarUrl
              )
                comment.user.avatarUrl = userCopy.avatarUrl;
            });
          });
          return pagesCopy;
        });
        return userCopy;
      });
    }
  }, [avatar]);

  useEffect(() => {
    const getUser = async () => {
      let response = await get("/User/Me", {});
      if (response.success) setUser(response.data);
    };
    if (isAuthenticated) getUser();
    else setUser(null);
  }, [isAuthenticated]);

  useEffect(() => {
    init();
  }, [namespaceId, threadIdentifier]);

  useEffect(() => {
    setComments(pages[page]);
  }, [pages, page]);

  const handleCommentChange = e => {
    setComment(e.target.value);
  };

  const handleSendComment = async () => {
    if (!comment) {
      return;
    }
    setCommentLoading(true);
    let tempComment = comment;

    let response = await post("/Comment/Create", {
      threadId: threadId,
      namespaceId: namespaceId,
      body: tempComment
    });
    setComment("");
    setCommentLoading(false);
    if (response.success) {
      //init();
      /*handlePageChange(null, {
        activePage: Math.ceil((thread.comments + 1) / commentsPerPage)
      });*/
      setNewComment(response.data.commentId);
      let newPage = 1; //Math.ceil((thread.comments + 1) / commentsPerPage);
      setThread({
        ...thread,
        comments: thread.comments + 1,
        totalComments: thread.totalComments + 1
      });
      setSelectedSort(0);
      response = await get("/Comment/Search", {
        threadId: threadId,
        pageIndex: newPage - 1,
        sortType: 0 //selectedSort
      });
      if (response.success) {
        setComments([...response.data]);
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
    if (tempComments) {
      tempComments.forEach(comment => {
        if (comment.replying) comment.replying = false;
        if (comment.replies) {
          comment.replies.forEach(reply => {
            if (reply.replying) reply.replying = false;
          });
        }
      });
    }
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

    if (tempComments) {
      tempComments.forEach(comment => {
        if (comment.replying) comment.replying = false;
        if (comment.replies) {
          comment.replies.forEach(reply => {
            if (reply.replying) reply.replying = false;
          });
        }
      });
    }
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
    if (
      convertedDate.getFullYear() === now.getFullYear() &&
      convertedDate.getMonth() === now.getMonth() &&
      convertedDate.getDate() === now.getDate()
    ) {
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
    tempComments[index].loading = true;
    setComments(tempComments);

    let response = await post("/Comment/Create", {
      threadId: threadId,
      namespaceId: namespaceId,
      parentCommentId: comments[index].commentId,
      body: comments[index].reply
    });
    tempComments = [...comments];
    tempComments[index].reply = "";
    tempComments[index].replying = false;
    tempComments[index].loading = false;
    setComments(tempComments);
    setNewComment(response.data.commentId);
    if (response.success) {
      response = await get("/Comment/Search", {
        threadId: threadId,
        pageIndex: 0,
        parentId: tempComments[index].commentId,
        pageSize: 5
      });
      if (response.success) {
        tempComments = [...tempComments];
        tempComments[index].replies = response.data;
        tempComments[index].showReplies = true;
        tempComments[index].replyCount =
          (tempComments[index].replyCount || 0) + 1;
        setComments(tempComments);
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
    let tempComments = [...comments];
    tempComments[commentIndex].replies[replyIndex].replyLoading = true;
    setComments(tempComments);
    let response = await post("/Comment/Create", {
      threadId: threadId,
      namespaceId: namespaceId,
      parentCommentId: comments[commentIndex].commentId,
      body: comments[commentIndex].replies[replyIndex].reply
    });
    tempComments = [...tempComments];
    tempComments[commentIndex].replies[replyIndex].reply = "";
    tempComments[commentIndex].replies[replyIndex].replying = false;

    setComments(tempComments);
    setNewComment(response.data.commentId);

    if (response.success) {
      response = await get("/Comment/Search", {
        threadId: threadId,
        pageIndex: 0,
        parentId: tempComments[commentIndex].commentId,
        pageSize: 5
      });
      if (response.success) {
        tempComments = [...tempComments];
        tempComments[commentIndex].replies = response.data;
        tempComments[commentIndex].showReplies = true;
        tempComments[commentIndex].replyCount =
          (tempComments[commentIndex].replyCount || 0) + 1;
        setComments(tempComments);
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

  const handleCollapseReplies = commentIndex => async e => {
    let tempComments = [...comments];
    tempComments[commentIndex].showReplies = !tempComments[commentIndex]
      .showReplies;

    if (!tempComments[commentIndex].replies) {
      //make request for replies

      tempComments[commentIndex].repliesLoading = true;
      setComments(tempComments);

      let response = await get("/Comment/Search", {
        threadId: threadId,
        pageIndex: tempComments[commentIndex].repliesPageIndex || 0,
        parentId: comments[commentIndex].commentId,
        pageSize: 5
      });
      tempComments = [...tempComments];
      if (response.success) {
        tempComments[commentIndex].replies = response.data;
        if (tempComments[commentIndex].repliesPageIndex)
          tempComments[commentIndex].repliesPageIndex++;
        else tempComments[commentIndex].repliesPageIndex = 1;
      }
      tempComments[commentIndex].repliesLoading = false;
    }

    setComments(tempComments);
  };

  const handleLoadReplies = commentIndex => async e => {
    let tempComments = [...comments];

    tempComments[commentIndex].repliesLoading = true;
    setComments(tempComments);

    let response = await get("/Comment/Search", {
      threadId: threadId,
      pageIndex: tempComments[commentIndex].repliesPageIndex || 0,
      parentId: comments[commentIndex].commentId,
      pageSize: 5
    });
    tempComments = [...tempComments];
    if (response.success) {
      tempComments[commentIndex].replies = [
        ...tempComments[commentIndex].replies,
        ...response.data
      ];
      if (tempComments[commentIndex].repliesPageIndex)
        tempComments[commentIndex].repliesPageIndex++;
      else tempComments[commentIndex].repliesPageIndex = 1;
    }
    tempComments[commentIndex].repliesLoading = false;

    setComments(tempComments);
  };

  const handlePageChange = async (e, { activePage }) => {
    setPage(activePage - 1);

    if (!pagesLoaded.includes(activePage - 1)) {
      setLoading(true);
      let response = await get("/Comment/Search", {
        threadId: threadId,
        pageIndex: activePage - 1,
        sortType: selectedSort
      });
      setLoading(false);

      if (response.success) {
        setComments([...comments, ...response.data]);
        setPagesLoaded([...pagesLoaded, activePage - 1]);

        let tempPages = [...pages];
        tempPages[activePage - 1] = response.data;
        setPages(tempPages);
      }
    }
  };

  const handleThreadLike = async () => {
    let threadCopy = { ...thread };
    threadCopy.likeLoading = true;
    setThread(threadCopy);

    let response = await post("/Thread/Rate", {
      type: 1,
      threadId: thread.threadId
    });

    threadCopy = { ...thread };
    threadCopy.likeLoading = false;
    if (response.success) {
      threadCopy.likes++;
    }
    setThread(threadCopy);
  };

  const handleOpenNormalSignIn = () => {
    let w = 400;
    let h = 500;
    const y =
      (outerHeight === -1 ? window.top.outerHeight : outerHeight) / 2 +
      (screenY === -1 ? window.top.screenY : screenY) -
      h / 2;
    const x =
      (outerWidth === -1 ? window.top.outerWidth : outerWidth) / 2 +
      (screenX === -1 ? window.top.screenX : screenX) -
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

  const responseGoogle = async response => {
    let authResponse = await post("/Auth/GoogleLogin", { code: response.code });
    if (authResponse.success) {
      login(authResponse.data.token);
    }
  };

  const responseFacebook = async response => {
    let authResponse = await post("/Auth/FacebookLogin", {
      accessToken: response.accessToken,
      userId: response.userID
    });
    if (authResponse.success) {
      login(authResponse.data.token);
    }
  };

  const handleSortSelect = id => async e => {
    if (id === selectedSort) return;

    setSelectedSort(id);
    const activePage = 1;
    setPage(activePage - 1);
    setLoading(true);
    let response = await get("/Comment/Search", {
      threadId: threadId,
      pageIndex: activePage - 1,
      sortType: id
    });
    setLoading(false);

    if (response.success) {
      setComments([...response.data]);
      setPagesLoaded([activePage - 1]);

      let tempPages = [...pages];
      tempPages[activePage - 1] = response.data;
      setPages(tempPages);
    }
  };

  return (
    <div id="jthread-container" onClick={handleClickAway} ref={containerRef}>
      <style
        dangerouslySetInnerHTML={{
          __html: [
            `.ui.placeholder,
            .ui.placeholder .image.header:after,
            .ui.placeholder .line,
            .ui.placeholder .line:after,
            .ui.placeholder > :before {
              background-color: #${backgroundColor};
            }`
          ].join("\n")
        }}
      ></style>
      <Comment.Group style={{ maxWidth: "100%" }} size="large">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex" }}>
            <Icon name="comments" size="large" color="grey" />
            <Header as="h3" color="grey" style={{ margin: 0 }}>
              {thread?.totalComments || 0} comments
            </Header>
          </div>

          {isAuthenticated ? (
            <Dropdown
              button
              labeled
              style={{ margin: 0 }}
              text={
                <Header as="h3" color="grey">
                  Signed in as {claims.name}
                </Header>
              }
              icon={
                <Icon
                  name="ellipsis vertical"
                  style={{
                    margin: 0,
                    marginLeft: 4,
                    marginTop: 2,
                    fontSize: "1.25rem"
                  }}
                />
              }
            >
              <Dropdown.Menu>
                <Dropdown.Item
                  text="Profile"
                  icon="user"
                  as="a"
                  target="_blank"
                  href={config.dashboard + "/profile"}
                />
                <Dropdown.Item
                  text="Change Avatar"
                  icon="picture"
                  onClick={async () => {
                    //setChangeAvatarOpen(true);
                    if (user) {
                      window.parent.postMessage(
                        { showAvatarModal: true, user: user },
                        "*"
                      );
                    }
                  }}
                />
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
            <Dropdown
              direction="left"
              style={{ margin: 0 }}
              text={
                <Header as="h3" color="grey" style={{ display: "flex" }}>
                  <Icon name="lock" style={{ marginRight: 6, fontSize: 18 }} />
                  Sign in
                </Header>
              }
              button
              labeled
            >
              <Dropdown.Menu>
                <Dropdown.Item
                  text={
                    <>
                      <Icon name="comments" />
                      JThreads
                    </>
                  }
                  onClick={handleOpenNormalSignIn}
                />
                <GoogleLogin
                  clientId="655937877935-23gvd7f7bhjn9ocu6kaa3ub237i6c080.apps.googleusercontent.com"
                  render={renderProps => (
                    <Dropdown.Item
                      onClick={renderProps.onClick}
                      disabled={renderProps.disabled}
                      text={
                        <span style={{ display: "flex", alignItems: "center" }}>
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
                  )}
                  buttonText="Login"
                  onSuccess={responseGoogle}
                  onFailure={responseGoogle}
                  cookiePolicy={"single_host_origin"}
                  responseType="code"
                />

                <FacebookLogin
                  version={"6.0"}
                  appId="200437064400153"
                  callback={responseFacebook}
                  render={renderProps => (
                    <Dropdown.Item
                      text="Facebook"
                      icon="facebook blue"
                      onClick={renderProps.onClick}
                    />
                  )}
                />

                <Dropdown.Item text="Twitter" icon="twitter blue" disabled />
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
        <Divider />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}
        >
          <List divided horizontal>
            <List.Item>
              <Button
                as="div"
                labelPosition="right"
                size="tiny"
                onClick={handleThreadLike}
              >
                <Button color="red" size="tiny" loading={thread.likeLoading}>
                  <Icon name="heart" />
                  Like
                </Button>
                <Label as="a" basic color="red" pointing="left" size="tiny">
                  {thread.likes || 0}
                </Label>
              </Button>
            </List.Item>
            <List.Item>
              <Header as="h4">Views: {thread.views || 0}</Header>
            </List.Item>
          </List>
          <List divided horizontal>
            <List.Item>
              <Dropdown
                direction="left"
                button
                text={
                  <Header as="h4" color="grey">
                    Share
                  </Header>
                }
                labeled
                icon={
                  <Icon name="share" style={{ marginLeft: 6, marginTop: 2 }} />
                }
              >
                <Dropdown.Menu>
                  <Dropdown.Item text="Facebook" icon="facebook blue" />
                  <Dropdown.Item text="Twitter" icon="twitter blue" />
                </Dropdown.Menu>
              </Dropdown>
            </List.Item>
            <List.Item>
              <Dropdown
                direction="left"
                labeled
                button
                header
                text={
                  <Header as="h4" color="grey">
                    Sort by
                  </Header>
                }
              >
                <Dropdown.Menu>
                  <Dropdown.Item
                    text="Most Recent"
                    selected={selectedSort === 0}
                    onClick={handleSortSelect(0)}
                  />
                  <Dropdown.Item
                    text="Highest rating"
                    onClick={handleSortSelect(1)}
                    selected={selectedSort === 1}
                  />
                  <Dropdown.Item
                    onClick={handleSortSelect(2)}
                    text="Most Replies"
                    selected={selectedSort === 2}
                  />
                </Dropdown.Menu>
              </Dropdown>
            </List.Item>
            <List.Item style={{ height: 24.67 }}>
              <Dropdown
                direction="left"
                labeled
                button
                text={
                  <Header as="h5" color="grey">
                    <Icon name="setting" style={{ marginRight: 0 }} />
                  </Header>
                }
              >
                <Dropdown.Menu>
                  <Dropdown.Item text="Setting 1" />
                  <Dropdown.Item text="Setting 2" />
                  <Dropdown.Item text="Setting 3" />
                </Dropdown.Menu>
              </Dropdown>
            </List.Item>
          </List>
        </div>
        <div style={{ display: "flex", marginTop: 16 }}>
          <Comment>
            <Comment.Avatar
              src={
                user?.avatarUrl ||
                "https://bestnycacupuncturist.com/wp-content/uploads/2016/11/anonymous-avatar-sm.jpg"
              }
            />
          </Comment>
          <Form reply style={{ marginLeft: 16, width: "100%" }}>
            <Form.TextArea
              value={comment}
              onChange={handleCommentChange}
              placeholder={"Leave a comment"}
              disabled={!isAuthenticated || commentLoading}
              rows={2}
              style={{ height: 70, width: "100%" }}
            />

            {isAuthenticated && (
              <Button
                content="Add Comment"
                loading={commentLoading}
                labelPosition="left"
                icon="edit"
                primary
                onClick={handleSendComment}
              />
            )}
          </Form>
        </div>
        {!isAuthenticated && (
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
              <FacebookLogin
                version={"6.0"}
                appId="200437064400153"
                callback={responseFacebook}
                render={renderProps => (
                  <Button
                    circular
                    color="facebook"
                    icon="facebook"
                    size="large"
                    onClick={renderProps.onClick}
                  />
                )}
              />

              <Button
                circular
                color="twitter"
                icon="twitter"
                size="large"
                disabled
              />

              <Button
                circular
                icon="comments"
                size="large"
                color="black"
                onClick={handleOpenNormalSignIn}
              />
              <GoogleLogin
                clientId="655937877935-23gvd7f7bhjn9ocu6kaa3ub237i6c080.apps.googleusercontent.com"
                render={renderProps => (
                  <Button
                    circular
                    icon
                    size="large"
                    onClick={renderProps.onClick}
                    disabled={renderProps.disabled}
                  >
                    <img
                      style={{ width: "1.1em" }}
                      src="https://cdn.aircomechanical.com/wp-content/uploads/2018/12/google-review-button.png"
                    />
                  </Button>
                )}
                buttonText="Login"
                onSuccess={responseGoogle}
                onFailure={responseGoogle}
                cookiePolicy={"single_host_origin"}
                responseType="code"
              />
            </div>
          </Container>
        )}

        <div style={{ paddingTop: 16 }}>
          {loading ? (
            <Placeholder fluid style={{ marginTop: 16, marginBottom: 32 }}>
              {new Array(10).fill(0).map((elem, index) => (
                <>
                  <Placeholder.Header image>
                    <Placeholder.Line />
                    <Placeholder.Line />
                  </Placeholder.Header>
                  <Placeholder.Paragraph>
                    <Placeholder.Line />
                    <Placeholder.Line />
                    <Placeholder.Line />
                  </Placeholder.Paragraph>
                </>
              ))}
            </Placeholder>
          ) : pages[page]?.length > 0 ? (
            <>
              {comments.map((comment, commentIndex) => (
                <Comment
                  key={comment.commentId}
                  style={{
                    paddingBottom: "1rem",
                    paddingTop: "1rem",
                    margin: 0,
                    backgroundColor:
                      comment.commentId === newComment
                        ? "rgba( 250, 223, 173, 0.2)"
                        : "inherit",
                    borderRadius: 10
                  }}
                >
                  <Comment.Avatar
                    src={
                      comment.user?.avatarUrl ||
                      "https://bestnycacupuncturist.com/wp-content/uploads/2016/11/anonymous-avatar-sm.jpg"
                    }
                  />
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
                    <Comment.Text>
                      <CommentBody body={comment.body} />
                    </Comment.Text>
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

                      {comment.replyCount > 0 && (
                        <>
                          <Comment.Action>|</Comment.Action>
                          <Comment.Action
                            onClick={handleCollapseReplies(commentIndex)}
                          >
                            <Icon
                              name={
                                comment.showReplies ? "caret up" : "caret down"
                              }
                            />
                            {comment.replyCount +
                              (comment.replyCount > 1 ? " replies" : " reply")}
                          </Comment.Action>
                        </>
                      )}
                      {comment.replying && (
                        <Form style={{ paddingTop: 8 }}>
                          <Form.Field width={12}>
                            <input
                              placeholder="Reply"
                              autoFocus
                              disabled={comment.loading || !isAuthenticated}
                              value={comment.reply || ""}
                              onChange={handleCommentReplyChange(commentIndex)}
                            />
                          </Form.Field>
                          <Form.Field onClick={handleSendReply(commentIndex)}>
                            <Button
                              size="small"
                              loading={comment.loading}
                              disabled={!isAuthenticated}
                            >
                              Send
                            </Button>
                          </Form.Field>
                        </Form>
                      )}
                    </Comment.Actions>
                  </Comment.Content>
                  {comment.showReplies && (
                    <Comment.Group size="large">
                      {comment.replies?.map((reply, replyIndex) => (
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
                            <Comment.Text>
                              <CommentBody body={reply.body} />
                            </Comment.Text>
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
                                        "@" + reply.user?.displayName + " "
                                      }
                                      onChange={handleCommentReplyResponseChange(
                                        commentIndex,
                                        replyIndex
                                      )}
                                    />
                                  </Form.Field>
                                  <Form.Field
                                    onClick={handleSendReplyResponse(
                                      commentIndex,
                                      replyIndex
                                    )}
                                  >
                                    <Button
                                      size="small"
                                      loading={reply.replyLoading}
                                    >
                                      Send
                                    </Button>
                                  </Form.Field>
                                </Form>
                              )}
                            </Comment.Actions>
                          </Comment.Content>
                        </Comment>
                      ))}
                      {comment.repliesLoading && (
                        <Comment
                          style={{
                            marginTop: "1rem",
                            marginBottom: "1rem"
                          }}
                        >
                          <Placeholder>
                            {new Array(
                              comment.replyCount < 5 ? comment.replyCount : 5
                            )
                              .fill(0)
                              .map((elem, index) => (
                                <Placeholder.Header image key={"cr-" + index}>
                                  <Placeholder.Line />
                                  <Placeholder.Line />
                                </Placeholder.Header>
                              ))}
                          </Placeholder>
                        </Comment>
                      )}
                      {comment.replies?.length < comment.replyCount && (
                        <Form.Field>
                          <Button
                            size="small"
                            loading={comment.repliesLoading}
                            onClick={handleLoadReplies(commentIndex)}
                          >
                            Load more
                          </Button>
                        </Form.Field>
                      )}
                    </Comment.Group>
                  )}
                </Comment>
              ))}
              {Math.ceil(thread.comments / commentsPerPage) > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 32,
                    marginBottom: 32
                  }}
                >
                  <Pagination
                    totalPages={Math.ceil(thread.comments / commentsPerPage)}
                    activePage={page + 1}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div>
              <Divider hidden />
              <Header size="small" style={{ textAlign: "center" }}>
                No comments yet
              </Header>
            </div>
          )}
        </div>
        <Divider />

        <List horizontal divided>
          <List.Item>
            <Header as="h4">
              Powered by{" "}
              <a href="https://jthreads.jrdn.tech" target="_blank">
                JThreads
              </a>
            </Header>
          </List.Item>
        </List>
      </Comment.Group>
    </div>
  );
}
