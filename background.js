chrome.omnibox.onInputEntered.addListener((text) => {
  chrome.storage.local.get('shortcuts', (result) => {
      const shortcuts = result.shortcuts || {};
      const redirectUrl = Object.keys(shortcuts).find(key => key === text && shortcuts[key].isEnabled);
      
      if (redirectUrl) {
          // 現在のアクティブなタブを更新してリダイレクト
          chrome.tabs.update({ url: shortcuts[redirectUrl].url });
      } else {
          // URLが見つからなければ、Google検索を実行
          chrome.tabs.update({ url: `https://www.google.com/search?q=${text}` });
      }
  });
});
