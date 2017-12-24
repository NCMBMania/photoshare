const applicationKey = 'YOUR_APPLICATION_KEY';
const clientKey = 'YOUR_CLIENT_KEY';
const applicationId = 'YOUR_APPLICATION_ID';

const ncmb = new NCMB(applicationKey, clientKey);

const noProfileImage = 'img/user.png';
const noProfileName  = 'No name';

const myPhotos = new Proxy({}, {
  set: (target, key, value) => {
    if (!target[key]) {
      target[key] = value;
      updateMyPhotos();
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

document.addEventListener('init', function(event) {
  var page = event.target;
  const user = ncmb.User.getCurrentUser();
  if (user) {
    user
      .set('sessionTest', !user.sessionTest)
      .update()
      .then(() => {
        $('.userName').html(user.userName);
        $('.realName').html(user.realName || noProfileName);
        $('.profileImage').attr('src', user.profileImage || noProfileImage);
      })
      .catch((err) => {
        $('#nav')[0].pushPage('register.html', {animation: 'fade'});
      });
  }
  if (page.id === 'main') {
    if (!user) {
      // ログインページを表示
      $('#nav')[0].pushPage('register.html', {animation: 'fade'});
    }
  }
  if (page.id == "home-page") {
    const stories = $('#stories');
    const Photo = ncmb.DataStore('Photo');
    generateStoryBubbles(stories);
    Photo
      .limit(10)
      .include('user')
      .order('createDate')
      .fetchAll()
      .then((photos) => {
        for (let i = 0; i < photos.length; i += 1) {
          const photo = photos[i];
          timelinePhotos[photo.objectId] = photo;
        }
      });
  }
  if (page.id == 'profile-page') {
    getMyPhotos();
  }
});

const getMyPhotos = () => {
  const user = ncmb.User.getCurrentUser();
  if (user) {
    const Photo = ncmb.DataStore('Photo');
    Photo
    .limit(20)
    .equalTo('userObjectId', user.objectId)
    .fetchAll()
    .then((photos) => {
      for (let i = 0; i < photos.length; i += 1) {
        const photo = photos[i];
        photo.user = user;
        myPhotos[photo.objectId] = photo;
      }
    });
  }
}
const updateMyPhotos = () => {
  let index = 0;
  let row = 3;
  let divRow = ons.createElement('<ons-row />');
  const template = $('#gridTemplate').html();
  $('#grid_view').empty();
  for (let key in myPhotos) {
    const photo = myPhotos[key];
    const id = `grid-${photo.objectId}`;
    const content = Mustache.render(template, {
      id: id,
      photo: photo
    });
    if (index == row) {
      $('#grid_view').append(divRow);
      divRow = ons.createElement('<ons-row />');
      index = 0;
    }
    divRow.appendChild(ons.createElement(content));
    index += 1;
  }
  for (let i = index; i < row; i += 1) {
    divRow.appendChild(ons.createElement('<ons-col class="grid_wrapper" />'));
  }
  $('#grid_view').append(divRow);
};

const updateTimeline = (photos) => {
  for (let i in photos) {
    const photo = photos[i];
    const id = `post-${photo.objectId}`;
    if ($(`#${id}`).length > 0) {
      continue;
    }
    photo.location = photo.location || '';
    if (!photo.user.profileImage)
      photo.user.profileImage = noProfileImage;
    let favorite_message = 'No one favorites this photo yet.';
    if (photo.favorites.length > 0) {
      favorite_message = `
        <b> someone_one </b> and 
        ${photo.favorites.length - 1} other liked this.`;
    }
    const template = $('#photo').html();
    photo.timeAgo = timeago().format(photo.createDate);
    const content = Mustache.render(template, {
      id: id,
      photo: photo,
      favorite_message: favorite_message
    });
    $('.posts').prepend(ons.createElement(content));
  }
};

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
      const user = ncmb.User.getCurrentUser();
      const file = canvasToBlob();
      const fileName = `${user.objectId}-${(new Date()).getTime()}.jpg`;
      promises.push(fileUpload(fileName, file));
      return Promise.all(promises);
    })
    .then((results) => {
      const message = results[0];
      const fileUrl = results[1];
      const Photo = ncmb.DataStore('Photo');
      const user = ncmb.User.getCurrentUser();
      const acl = new ncmb.Acl();
      acl
        .setPublicReadAccess(true)
        .setUserWriteAccess(user, true);
      const latitude = $('#latitude').val();
      const longitude = $('#longitude').val();
      const location = $('#location').val();
      const photo = new Photo();
      photo
        .set('user', user)
        .set('userObjectId', user.objectId)
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
    })
    .catch((err) => {
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

$(document).on('change', '#cameraImageFile', (e) => {
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

const fileUpload = (fileName, file) => {
  return new Promise((res, rej) => {
    const user = ncmb.User.getCurrentUser();
    // アクセス権限の設定
    const acl = new ncmb.Acl();
    acl
      .setPublicReadAccess(true)
      .setUserWriteAccess(user, true);
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

$(document).on('change', '#profileImageFile', (e) => {
  const file = e.target.files[0];
  const user = ncmb.User.getCurrentUser();
  fileUpload(`${user.objectId}-${file.name}`, file)
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

const filePath = (fileName) => {
  return `https://mb.api.cloud.nifty.com/2013-09-01/applications/${applicationId}/publicFiles/${fileName}`;
};

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

const updateRealName = (e) => {
  const user = ncmb.User.getCurrentUser();
  const realName = e.target.value;
  const acl = new ncmb.Acl;
  acl
    .setPublicReadAccess(true)
    .setUserWriteAccess(user, true);
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

//The show event listener does the same thing as the one above but on the search page when it's shown.

document.addEventListener('show', function(event) {
  var page = event.target;

  if (page.id == "search-page") {
    var channels = page.querySelector('#channels');
    generateStoryBubbles(channels);
  }
  
  if (page.id == "profile-page") {
    page.querySelector('#profileImageUpload').addEventListener('click', (e) => {
      if (ons.platform.isIOS()) {
        $(e.target).click();
      }
      page.querySelector('#profileImageFile').click();
    });
  }
  
  if (page.id == 'camera-page') {
    $('.cameraPlaceholder').show();
    $('#preview').hide();
    $('#latitude').val('');
    $('#longitude').val('');
    $('#location').val('');
    page.querySelector('.select-photo').addEventListener('click', (e) => {
      if (ons.platform.isIOS()) {
        $(e.target).click();
      }
      page.querySelector('#cameraImageFile').click();
    });
  }
});

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

var like = function(num) {
  if ($("#button-post-like-"+num).hasClass("like")) {
    $("#button-post-like-"+num).removeClass('ion-ios-heart like');
    $("#button-post-like-"+num).addClass('ion-ios-heart-outline');
  } else {
    $("#button-post-like-"+num).removeClass('.ion-ios-heart-outline');
    $("#button-post-like-"+num).addClass('ion-ios-heart like');
    $("#post-like-"+num).css("opacity", 1);

    setTimeout(function(){
      $("#post-like-"+num).css('opacity', 0);
    }, 600);
  }
}

//The readStory function is used to change the red circle around a new story into grey after tapping on the new storry (thus reading it)

var readStory = function(event) {
  $(event).parent().removeClass('unread');
  $(event).parent().addClass('read');
}

