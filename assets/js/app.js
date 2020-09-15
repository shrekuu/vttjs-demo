import { of, zip, fromEvent } from 'rxjs'
import { ajax } from 'rxjs/ajax'
import { map, startWith, switchMap, takeWhile, throttleTime } from 'rxjs/operators'

const videoEl = document.querySelector('#video')
const subtitlesContainer = document.getElementById('subtitlesContainer')

let isSubtitlesLoaded = false

const parser = new WebVTT.Parser(window, WebVTT.StringDecoder())
let cues = []
let regions = []

parser.oncue = function (cue) {
  cues.push(cue)
}

parser.onregion = function (region) {
  regions.push(region)
}

const subtitlesLangPickerChange$ = fromEvent(subtitlesLangPicker, 'change').pipe(
  map((e) => {
    return e.target.value
  }),
)

// 取字幕
let subtitlesCache = []
subtitlesLangPickerChange$.pipe(
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
        switchMap(([subtitleLang, res])  => {
          subtitlesCache[subtitleLang] = res
          return of(res)
        })
      )
    }),
  ).subscribe(
  (res) => {

    const vtt = res.response

    // 清空旧的
    cues = []
    regions = []

    parser.parse(vtt)
    parser.flush()

    isSubtitlesLoaded = true
  },
)

const videoQualityPickerChange$ = fromEvent(videoQualityPicker, 'change')
  .subscribe(
    ({ target: { value } }) => {
      console.log('value', value)
      const currentTime = video.currentTime
      video.src = value
      video.load() // 好像不需要这行
      video.currentTime = currentTime
      video.play()
    },
  )

fromEvent(videoEl, 'timeupdate')
  .pipe(
    takeWhile(() => isSubtitlesLoaded),
    throttleTime(500),
  ).subscribe(
  (e) => {

    const currentCue = cues.find((cue) => {
      return cue.startTime <= videoEl.currentTime && videoEl.currentTime <= cue.endTime
    })

    if (!currentCue) {
      subtitlesContainer.innerHTML = ''
      return
    }

    WebVTT.processCues(window, [currentCue], subtitlesContainer)
  },
)
