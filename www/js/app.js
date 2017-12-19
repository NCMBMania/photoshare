
/*
*  This event listener will populate the top of the home screen with user stories when the page is initialized.
*  It uses the generateStoryBubbles function to do so.
*/
const applicationKey = 'YOUR_APPLICATION_KEY';
const clientKey = 'YOUR_CLIENT_KEY';
const ncmb = new NCMB(applicationKey, clientKey);

document.addEventListener('init', function(event) {
  var page = event.target;
  const user = ncmb.User.getCurrentUser();
  if (page.id === 'main') {
    if (!user) {
      // ログインページを表示
      document.querySelector('#nav').pushPage('register.html', {animation: 'fade'});
    }
  }
  if (page.id == "home-page") {
    var stories = page.querySelector('#stories');
    generateStoryBubbles(stories);
  }

});

// ユーザ登録/ログイン処理です
const login = () => {
  // 入力された情報です
  const userName = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  // ユーザを作成します
  const user = new ncmb.User();
  user
    .set("userName", userName)
    .set("password", password)
    // 登録処理を実行します
    .signUpByAccount()
    .then(() => {
      // 成功したらログイン処理を行います
      return ncmb.User.login(userName, password)
    })
    .catch((err) => {
      // 失敗したらログイン処理を行います
      return ncmb.User.login(userName, password)
    })
    .then((user) => {
      // ログイン成功したらメイン画面に遷移します
      document.querySelector('#nav').pushPage('main.html', {animation: 'fade'});
    })
    .catch((err) => {
      // 失敗したらアラートを出します
      ons.notification.alert('Login failed.')
    });
};

// ログアウト処理です
const logout = () => {
  // 確認ダイアログを出します
  ons.notification.confirm({
    message: 'Are you sure?'
  })
  .then((id) => {
    // id == 1 はOKボタンを押した場合です
    if (id != 1) {
      throw 1;
    }
    // ログアウト処理
    return ncmb.User.logout();
  })
  .then(() => {
    // 処理完了したら登録/ログイン画面に遷移します
    document.querySelector('#nav').pushPage('register.html', {animation: 'fade'});
  })
  .catch(() => {
    // 確認ダイアログでCancelを選んだ場合
  })
};

//The show event listener does the same thing as the one above but on the search page when it's shown.

document.addEventListener('show', function(event) {
  var page = event.target;

  if (page.id == "search-page") {
    var channels = page.querySelector('#channels');

    generateStoryBubbles(channels);
  }
});

/*
* This function is used to toggle the grid/list display of the posts in the profile page as well as
* change the color of the buttons to show which is the current view.
*/

function display(id) {
  document.getElementById("list").style.color="#1f1f21";
  document.getElementById("grid").style.color="#1f1f21";
  document.getElementById(id).style.color="#5fb4f4";

  document.getElementById("list_view").style.display="none";
  document.getElementById("grid_view").style.display="none";
  document.getElementById(id+"_view").style.display="block";
}

//The generateStoryBubbles function is used to create the carousel items be used as stories by the upper two events.

function generateStoryBubbles(element) {
  for(var i=0; i<9; i++) {
    element.appendChild(ons.createElement(
      '<ons-carousel-item>' +
        '<div class="story">' +
        '<div class="story-thumbnail-wraper unread"><img class="story-thumbnail" src="img/profile-image-0' + (i+1) + '.png" onclick="readStory(this)"></div>' +
        '<p>david_graham</p>' +
        '</div>' +
      '</ons-carousel-item>'
    ));
  }
}

//The Like function is used to make the white heart appear in front of the picture as well as make the like button into a red heart and vice versa.

var like = function(num) {
  if (document.getElementById("button-post-like-"+num).classList.contains("like")) {
    document.getElementById("button-post-like-"+num).classList.remove("ion-ios-heart","like");
    document.getElementById("button-post-like-"+num).classList.add("ion-ios-heart-outline");
  } else {
    document.getElementById("button-post-like-"+num).classList.remove("ion-ios-heart-outline");
    document.getElementById("button-post-like-"+num).classList.add("ion-ios-heart","like");
    document.getElementById("post-like-"+num).style.opacity = 1;

    setTimeout(function(){
      document.getElementById("post-like-"+num).style.opacity = 0;
    }, 600);
  }
}

//The readStory function is used to change the red circle around a new story into grey after tapping on the new storry (thus reading it)

var readStory = function(event) {
  event.parentNode.classList.remove("unread");
  event.parentNode.classList.add("read");
}


