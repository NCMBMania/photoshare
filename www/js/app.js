const applicationKey = 'b347bafb25296ae896e06684068574f4332e2526626f78b475e799ca5882901e';
const clientKey = '4895215f6469f325e6278afdb8d0178ddb88659964fd2b0e73ed4db4417bd462';
const applicationId = 'LFjLhn8sZS05V76R';

const ncmb = new NCMB(applicationKey, clientKey);
let current_user = ncmb.User.getCurrentUser();
if (current_user) {
  ncmb.User
    .equalTo('objectId', current_user.objectId)
    .fetch()
    .then((user) => {
      current_user = user;
    })
    .catch((err) => {
      console.error(err);
    })
}
const noProfileImage = 'img/user.png';
const noProfileName  = 'No name';

const myPhotos = new Proxy({}, {
  set: (target, key, value) => {
    if (!target[key]) {
      target[key] = value;
      updateMyPhotos($('#grid_view'), target);
    }
    timelinePhotos[key] = value;
  }
});

const timelinePhotos = new Proxy({}, {
  set: (target, key, value) => {
    if (!target[key]) {
      target[key] = value;
      updateTimeline(target);
    }
  }
});

// 初期表示処理
document.addEventListener('init', function(event) {
  var page = event.target;
  loginCheck();
  if (page.id === 'main') {
    if (!current_user) {
      // ログインページを表示
      $('#nav')[0].pushPage('register.html', {animation: 'fade'});
    }
  }
  if (page.id == "home-page") {
    loadTimeline();
  }
  if (page.id == 'profile-page') {
    getMyPhotos();
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
      current_user = user;
      // 写真の取得
      getMyPhotos();
      // ログイン成功したらメイン画面に遷移します
      $('#nav')[0].pushPage('main.html', {animation: 'fade'});
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
    current_user = null;
    $('#nav').pushPage('register.html', {animation: 'fade'});
  })
  .catch(() => {
    // 確認ダイアログでCancelを選んだ場合
  })
};

const editProfile = () => {
  $('#editRealName').html(ons.createElement(`
    <ons-input modifier="underbar" onblur="updateRealName(event)" style="width:50%" />
  `));
};

const showPhotos = (dom) => {
  return new Promise((res, rej) => {
    $(dom).hide();
    $(dom).empty();
    const Photo = ncmb.DataStore('Photo');
    Photo
      .limit(20)
      .include('user')
      .order('-createDate')
      .fetchAll()
      .then((photos) => {
        for (let i = 0; i < photos.length; i += 1) {
          const photo = photos[i];
          $(dom).append(ons.createElement(`
            <ons-col class="search_wrapper">
              <img class="search_thumbnail" src="${photo.fileUrl}" data-photo="${photo.objectId}">
            </ons-col>
          `));
          $(dom).show();
          $('.loading').hide();
        }
        res(photos);
      });
  });
}
const isFollow = (user) => {
  return current_user.follows && current_user.follows.indexOf(user.objectId) > -1
}

const showUserPage = (dom, user) => {
  dom.find('.profileImage').attr('src', user.profileImage);
  dom.find('.realName').text(user.realName);
  dom.find('.photo_count').text(user.photo_count);
  dom.find('.follower_count').text(user.follows ? user.follows.length : 0);
  if (user.objectId == current_user.objectId) {
    $(dom).find('.follow').attr('disabled', true);
  }
  ncmb.User
    .equalTo('follows', user.objectId)
    .count()
    .fetchAll()
    .then((result) => {
      dom.find('.follow_count').text(result.count);
    });
  
  // フォローしているかチェック
  if (isFollow(user)) {
    $(dom).find('.follow').text('Unfollow');
  }
  
  // ユーザの写真を表示
  const Photo = ncmb.DataStore('Photo');
  Photo
    .limit(20)
    .equalTo('userObjectId', user.objectId)
    .fetchAll()
    .then((photos) => {
      updateMyPhotos(dom.find('#grid_view'), photos);
    });
  
  // フォロー/アンフォロー処理
  $(dom).find('.follow').on('click', (e) => {
    let follows = current_user.follows;
    if (!follows) {
      // まだデータがない場合は初期化
      follows = [user.objectId];
    } else {
      // すでにフォローしているかチェック
      if (follows.indexOf(user.objectId) > -1) {
        // フォローしていればアンフォロー
        follows = follows.filter((u) => {
          return (u !== user.objectId);
        });
      } else {
        // フォローしていなければフォロー
        follows.push(user.objectId);
      }
    }
    current_user
      .set('follows', follows)
      .set('authData', {})  // ないとエラーになります
      .update()
      .then(() => {
        // フォロー状態をチェックしてボタンの文字を変更
        $(dom).find('.follow').text(isFollow(user) ? 'Unfollow' : 'Follow');
      })
  });
};

//The show event listener does the same thing as the one above but on the search page when it's shown.

document.addEventListener('show', function(event) {
  var page = event.target;
  if (page.id == "search-page") {
    showSearchPage($(page));
  }
  
  if (page.id == 'single-page') {
    showSinglePage($(page), page.data.photo);
  }
  
  if (page.id == "profile-page") {
    showProfilePage($(page));
  }
  
  if (page.id == 'camera-page') {
    showCameraPage($(page));
  }
  
  if (page.id == 'user-page') {
    showUserPage($(page), page.data.user);
  }
});

const showSearchPage = (dom) => {
  const photoView = dom.find('#photos');
  showPhotos(photoView)
    .then((photos) => {
      dom.on('click', '.search_thumbnail', (e) => {
        const objectId = $(e.target).data('photo');
        const photo = photos.filter((photo) => {
          if (photo.objectId == objectId) {
            return photo;
          }
        })[0];
        $('#nav')[0].pushPage('single.html', {animation: 'slide', data: {photo: photo}});
      });
    });
}

const showSinglePage = (dom, photo) => { 
  const Like = ncmb.DataStore('Like');
  Like
    .equalTo('photoObjectId', photo.objectId)
    .fetch()
    .then((like) => {
      appendPhoto(dom.find('.post'), photo, like);
    });
  dom.find('.photo-title').text(photo.message);
}

const showProfilePage = (dom) => {
  dom.find('#profileImageUpload').on('click', (e) => {
    if (ons.platform.isIOS()) {
      $(e.target).click();
    }
    dom.find('#profileImageFile').click();
  });
}

const showCameraPage = (dom) => {
  dom.find('.cameraPlaceholder').show();
  dom.find('#preview').hide();
  dom.find('#latitude').val('');
  dom.find('#longitude').val('');
  dom.find('#location').val('');
  dom.find('.select-photo').on('click', (e) => {
    if (ons.platform.isIOS()) {
      $(e.target).click();
    }
    dom.find('#cameraImageFile').click();
  });

  dom.on('change', '#cameraImageFile', (e) => {
    const file = e.target.files[0];
    const fr = new FileReader();
    fr.onload = (e) => {
      const img = new Image();
      img.onload = (e) => {
        loadExif(img)
          .then((exif) => {
            drawImage(img, exif.orientation);
            waitAndUpload();
            return getAddress(exif)
          })
          .then((results) => {
            $('.cameraPlaceholder').hide();
            $('#preview').show();
            $('#latitude').val(results.latitude);
            $('#longitude').val(results.longitude);
            $('#location').val(results.address);
          }, (err) => {
            console.log(err);
          });
      };
      img.src = e.target.result;
    };
    fr.readAsDataURL(file);
  });
}
/*
* This function is used to toggle the grid/list display of the posts in the profile page as well as
* change the color of the buttons to show which is the current view.
*/

function display(id) {
  $("#list").style.color="#1f1f21";
  $("#grid").style.color="#1f1f21";
  $(`#${id}`).style.color="#5fb4f4";

  $("#list_view").style.display="none";
  $("#grid_view").style.display="none";
  $(`${id}_view`).style.display="block";
}

//The generateStoryBubbles function is used to create the carousel items be used as stories by the upper two events.

function generateStoryBubbles(element) {
  const html = [];
  for(var i=0; i<9; i++) {
    html.push(ons.createElement(
      '<ons-carousel-item>' +
        '<div class="story">' +
        '<div class="story-thumbnail-wraper unread"><img class="story-thumbnail" src="img/profile-image-0' + (i+1) + '.png" onclick="readStory(this)"></div>' +
        '<p>david_graham</p>' +
        '</div>' +
      '</ons-carousel-item>'
    ).outerHTML);
  }
  element.html(html.join('&nbsp;'));
}

//The Like function is used to make the white heart appear in front of the picture as well as make the like button into a red heart and vice versa.

const like = (num) => {
  if ($("#button-post-like-"+num).hasClass("like")) {
    // Like済み
    $("#button-post-like-"+num)
      .removeClass('ion-ios-heart like')
      .addClass('ion-ios-heart-outline');
  } else {
    // まだLikeしていない
    $("#button-post-like-"+num)
      .removeClass('ion-ios-heart-outline')
      .addClass('ion-ios-heart like');
    // 写真の上のハート表示/600ms後に消す処理
    $("#post-like-"+num).css("opacity", 1);
    setTimeout(function(){
      $("#post-like-"+num).css('opacity', 0);
    }, 600);
  }
  likeCreateOrUpdate(num.replace(/^post\-/, ''));
}

const comment = (num) => {
  ons.notification.prompt({
    message: 'Comment?'
  })
  .then((text) => {
    if (text) {
      likeCreateOrUpdate(num.replace(/^post\-/, ''), text);
      const messageTemplate = $('#comment').html();
      const message = Mustache.render(messageTemplate, {
        messages: [{
          profileImage: current_user.profileImage,
          username: current_user.userName,
          comment: text
        }]
      });
      $(`#${num}`).find('.post-comments').append(ons.createElement(message));
    }
  })
}

const likeCreateOrUpdate = (photoObjectId, comment) => {
  const Like = ncmb.DataStore('Like');
  Like
    .equalTo('photoObjectId', photoObjectId)
    .fetch()
    .then((like) => {
      if (Object.keys(like).length == 0) {
        // データなし
        like = new Like;
        like
          .set('users', [])
          .set('photoObjectId', photoObjectId);
      }
      if (comment) {
        let messages = like.messages;
        const message = {
          profileImage: current_user.profileImage,
          username: current_user.userName,
          comment: comment
        };
        if (messages) {
          messages.push(message);
        } else {
          messages = [message];
        }
        like.set('messages', messages);
      }else{
        if (like.users.indexOf(current_user.objectId) > -1) {
          // データあり
          like.remove('users', current_user.objectId);
        } else {
          if (like.objectId) {
            like.addUnique('users', current_user.objectId);
          } else {
            like.set('users', [current_user.objectId]);
          }
        }
      }
      return like.objectId ? like.update() : like.save();
    })
    .then((like) => {
      console.log(like);
    })
}

//The readStory function is used to change the red circle around a new story into grey after tapping on the new storry (thus reading it)

var readStory = function(event) {
  $(event).parent().removeClass('unread');
  $(event).parent().addClass('read');
}

const getAddress = (exif) => {
  const results = {
    latitude: '',
    longitude: '',
    address: ''
  };
  return new Promise((res, rej) => {
    const lat = exif.lat;
    const long = exif.long;
    if (lat && long) {
    }else{
      return res(results);
    }
    results.latitude = lat[0] + (lat[1]/60) + (lat[2]/(60*60));
    results.longitude = long[0] + (long[1]/60) + (long[2]/(60*60));
    $.ajax({
      url: `https://geoapi.heartrails.com/api/json?method=searchByGeoLocation&y=${results.latitude}&x=${results.longitude}`,
      type: 'GET',
      dataType: 'jsonp'
    })
    .then((response) => {
      const location = response.response.location[0];
      if (location) {
        results.address = `${location.prefecture}${location.city}${location.town}`;
        res(results);
      }
    }, (err) => {
      res(results);
    });
  });
}

const loadExif = (img) => {
  return new Promise((res, rej) => {
    EXIF.getData(img, function() {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const long = EXIF.getTag(this, "GPSLongitude");
      const orientation = EXIF.getTag(this, "Orientation");
      res({
        lat: lat,
        long: long,
        orientation: orientation
      });
    });
  })
}

const drawImage = (img, orientation) => {
  const canvas = $("#preview")[0];
  const ctx = canvas.getContext('2d');
  const size = 320;
  const offset = {width: 0, height: 0};
  let rotate = 0;
  let width = height  = size;
  canvas.width = canvas.height = size;
  let originalWidth = img.width;
  let originalHeight = img.height;
  switch (orientation) {
    case 2:
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -height);
      break;
    case 7:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(width, -height);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-width, 0);
      break;
    default:
      break;
  }
  if (originalWidth > originalHeight) {
    // 横長
    width =  320 * originalWidth / originalHeight;
    offset.width = -1 * (width - size) / 2;
  }
  if (originalWidth < originalHeight) {
    // 縦長
    height =  320 * originalHeight / originalWidth;
    offset.height = -1 * (height - size) / 2;
  }
  ctx.drawImage(img, offset.width, offset.height, width, height);
};

const waitAndUpload = () => {
  setTimeout(() => {
    ons.notification.confirm({
      message: 'Do you want to upload?'
    })
    .then((id) => {
      // id == 1 はOKボタンを押した場合です
      if (id != 1) {
        throw 1;
      }
      const promises = [];
      
      promises.push(ons.notification.prompt({
        message: 'Write your memory!'
      }));
      const file = canvasToBlob();
      const fileName = `${current_user.objectId}-${(new Date()).getTime()}.jpg`;
      promises.push(fileUpload(fileName, file));
      return Promise.all(promises);
    })
    .then((results) => {
      const message = results[0];
      const fileUrl = results[1];
      const Photo = ncmb.DataStore('Photo');
      const acl = new ncmb.Acl();
      acl
        .setPublicReadAccess(true)
        .setUserWriteAccess(current_user, true);
      const latitude = $('#latitude').val();
      const longitude = $('#longitude').val();
      const location = $('#location').val();
      const photo = new Photo();
      photo
        .set('user', current_user)
        .set('userObjectId', current_user.objectId)
        .set('fileUrl', fileUrl)
        .set('message', message)
        .set('comments', [])
        .set('favorites', [])
        .set('location', location)
        .set('acl', acl);
      if (latitude != '' && longitude != '') {
        const geoPoint = new ncmb.GeoPoint(Number(latitude), Number(longitude));
        photo.set('geo', geoPoint);
      }
      return photo.save();
    })
    .then((photo) => {
      // Homeに戻る
      $('#tabbar')[0].setActiveTab(0);
      photo.user = ncmb.User.getCurrentUser();
      myPhotos[photo.objectId] = photo;
      let photo_count = current_user.photo_count || 0;
      photo_count++;
      current_user.set('photo_count', photo_count);
      return current_user.update();
    })
    .then(() => {
      
    })
    .catch((err) => {
      console.log(err);
      if (err === 1) {
        return;
      }
      ons.notification.alert(JSON.stringify(err));
    })
  }, 3000);
}

const canvasToBlob = () => {
  const type = 'image/jpeg';
  const canvas = $("#preview")[0];
  const dataurl = canvas.toDataURL(type);
  const bin = atob(dataurl.split(',')[1]);
  const buffer = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    buffer[i] = bin.charCodeAt(i);
  }
  const blob = new Blob([buffer.buffer], {type: type});
  return blob;
}

const fileUpload = (fileName, file) => {
  return new Promise((res, rej) => {
    
    // アクセス権限の設定
    const acl = new ncmb.Acl();
    acl
      .setPublicReadAccess(true)
      .setUserWriteAccess(current_user, true);
    ncmb.File
      .upload(fileName, file, acl)
      .then((f) => {
        res(filePath(f.fileName));
      })
      .catch((err) => {
        rej(err);
      })
  });
};

const filePath = (fileName) => {
  return `https://mb.api.cloud.nifty.com/2013-09-01/applications/${applicationId}/publicFiles/${fileName}`;
};

const updateRealName = (e) => {
  const realName = e.target.value;
  const acl = new ncmb.Acl;
  acl
    .setPublicReadAccess(true)
    .setUserWriteAccess(current_user, true);
  user
    .set('authData', {})
    .set('acl', acl)
    .set('realName', realName)
    .update()
    .then(() => {
      // 処理成功した場合は何も出力しない
      $('.realName').html(realName);
    })
    .catch((err) => {
      ons.notification.alert(err.message);
    })
}

// 写真表示をアップデートします
const updateMyPhotos = (dom, photos) => {
  let index = 0;
  let row = 3;
  let divRow = ons.createElement('<ons-row />');
  const template = $('#gridTemplate').html();
  dom.empty();
  for (let key in photos) {
    const photo = photos[key];
    const id = `grid-${photo.objectId}`;
    const content = Mustache.render(template, {
      id: id,
      photo: photo
    });
    if (index == row) {
      dom.append(divRow);
      divRow = ons.createElement('<ons-row />');
      index = 0;
    }
    divRow.appendChild(ons.createElement(content));
    index += 1;
  }
  for (let i = index; i < row; i += 1) {
    divRow.appendChild(ons.createElement('<ons-col class="grid_wrapper" />'));
  }
  dom.append(divRow);
};

// 写真を追加します
const appendPhoto = (dom, photo, like) => {
  const id = `post-${photo.objectId}`;
  photo.location = photo.location || '';
  if (!photo.user.profileImage)
    photo.user.profileImage = noProfileImage;
  let favorite_message = 'No one favorites this photo yet.';
  if (like && Object.keys(like).length > 0) {
    let who = 'someone';
    if (like.users.indexOf(current_user.objectId) > -1) {
      who = 'You';
    }
    favorite_message = `
      <b> ${who} </b> and 
      ${like.users.length - 1} other liked this.`;
  }
  const template = $('#photo').html();
  photo.liked   = like && like.users.indexOf(current_user.objectId) > -1 ? true : false;
  photo.timeAgo = timeago().format(photo.createDate);
  const messageTemplate = $('#comment').html();
  const messages = Mustache.render(messageTemplate, {
    messages: like ? like.messages : []
  });
  const content = Mustache.render(template, {
    id: id,
    photo: photo,
    favorite_message: favorite_message,
    messages: messages
  });
  dom.prepend(ons.createElement(content));
  $(dom).find('.profile_image').on('click', (e) => {
    $('#nav')[0].pushPage('user.html', {animation: 'slide', data: {user: photo.user}});
  });
}

const updateTimeline = (photos) => {
  const Like = ncmb.DataStore('Like');
  Like
    .in('photoObjectId', Object.keys(photos))
    .fetchAll()
    .then((likes) => {
      for (let i in photos) {
        const photo = photos[i];
        const like = likes.filter((like) => photo.objectId === like.photoObjectId)[0];
        appendPhoto($('.posts'), photo, like);
      }
    });
};

// ログインチェックを行います
const loginCheck = () => {
  if (current_user) {
    current_user
      .set('sessionTest', !current_user.sessionTest)
      .set('authData', {})
      .update()
      .then(() => {
        $('.userName').html(current_user.userName);
        $('.realName').html(current_user.realName || noProfileName);
        $('.profileImage').attr('src', current_user.profileImage || noProfileImage);
      })
      .catch((err) => {
        $('#nav')[0].pushPage('register.html', {animation: 'fade'});
      });
  }
}

// タイムライン画像の読み込みです
const loadTimeline = () => {
  const Photo = ncmb.DataStore('Photo');
  const follows = current_user.follows || [];
  follows.push(current_user.objectId)
  Photo
    .limit(10)
    .include('user')
    .in('userObjectId', follows)
    .order('createDate')
    .fetchAll()
    .then((photos) => {
      for (let i = 0; i < photos.length; i += 1) {
        const photo = photos[i];
        timelinePhotos[photo.objectId] = photo;
      }
    });
}

// 自分の写真を読み込みます
const getMyPhotos = () => {
  if (current_user) {
    const Photo = ncmb.DataStore('Photo');
    Photo
    .limit(20)
    .equalTo('userObjectId', current_user.objectId)
    .fetchAll()
    .then((photos) => {
      for (let i = 0; i < photos.length; i += 1) {
        const photo = photos[i];
        photo.user = current_user;
        myPhotos[photo.objectId] = photo;
      }
    });
  }
}


$(document).on('change', '#profileImageFile', (e) => {
  const file = e.target.files[0];
  fileUpload(`${current_user.objectId}-${file.name}`, file)
    .then((fileUrl) => {
      $('.profileImage').attr('src', fileUrl);
      // 自分の設定を更新
      return user
        .set('authData', {}) // 執筆時点ではこれがないと更新に失敗します
        .set('profileImage', fileUrl)
        .update()
    })
    .then(() => {
      
    })
    .catch((err) => {
      ons.notification.alert(JSON.stringify(err));
    })
});
