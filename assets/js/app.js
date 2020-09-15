import { of, zip, fromEvent } from 'rxjs'
import { ajax } from 'rxjs/ajax'
import { map, startWith, switchMap, takeWhile, throttleTime } from 'rxjs/operators'

// 视频元素
const videoEl = document.querySelector('#video')

// 字幕元素
const subtitlesEl = document.querySelector('#subtitles')

// 准备字幕解析器
const parser = new WebVTT.Parser(window, WebVTT.StringDecoder())
let cues = []
let regions = []

parser.oncue = function (cue) {
  cues.push(cue)
}

parser.onregion = function (region) {
  regions.push(region)
}

// 字幕选择
// 取字幕
let isSubtitlesLoaded = false
let subtitlesCache = []
// const subtitlesLangPickerEl =
fromEvent(document.querySelector('#subtitlesLangPicker'), 'change')
  .pipe(
    map((e) => {
      return e.target.value
    }),
    startWith(document.querySelector('#subtitlesLangPicker').value),
    switchMap((subtitlesLang) => {

      // 有缓存的话优先使用缓存
      if (subtitlesCache[subtitlesLang]) {
        return of(subtitlesCache[subtitlesLang])
      }

      // 没有缓存再去服务器取
      return zip(
        of(document.querySelector('#subtitlesLangPicker').value),
        ajax({
          url: `/static/${subtitlesLang}.vtt`,
          responseType: 'text', // 注意字段是纯文本
        }),
      ).pipe(
        switchMap(([subtitleLang, res]) => {
          subtitlesCache[subtitleLang] = res
          return of(res)
        }),
      )
    }),
  ).subscribe(
    (res) => {

      // 拿到字幕啦
      const vtt = res.response

      // 清空旧的
      cues = []
      regions = []

      // 解析字段
      parser.parse(vtt)
      parser.flush()

      // 标记字幕加载成功
      isSubtitlesLoaded = true
    },
  )

// 视频清晰度切换, 即切换视频
const videoQualityPickerChange$ = fromEvent(document.querySelector('#videoQualityPicker'), 'change')
  .subscribe(
    ({ target: { value } }) => {
      const currentTime = videoEl.currentTime
      videoEl.src = value
      videoEl.load() // 好像不需要这行
      videoEl.currentTime = currentTime
      videoEl.play()
    },
  )

// 视频播放进度更新
fromEvent(videoEl, 'timeupdate')
  .pipe(
    takeWhile(() => isSubtitlesLoaded), // 字幕加载好后再换
    throttleTime(500),  // 节流一下 500ms
  ).subscribe(
    (e) => {

      // 找到对应字幕
      const currentCue = cues.find((cue) => {
        return cue.startTime <= videoEl.currentTime && videoEl.currentTime <= cue.endTime
      })

      if (!currentCue) {
        subtitlesEl.innerHTML = ''
        return
      }

      // 把字幕更新上去
      WebVTT.processCues(window, [currentCue], subtitlesEl)
    },
  )
