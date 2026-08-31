/**
 * 서체 — IBM Plex 3종을 자체 호스팅한다.
 *
 * 구글 폰트 CDN을 쓰지 않는 이유: 외부 요청이 하나도 없어야 오프라인(PWA)에서도
 * 글자가 제대로 뜨고, 차단된 망에서도 깨지지 않으며, 구글로 나가는 요청도 없다.
 *
 * 서브셋을 콕 집어 가져온다. `400.css`처럼 웨이트만 지정하면 키릴·그리스·
 * 베트남어까지 전부 딸려와 번들이 8MB가 된다. 이 앱에 필요한 건 라틴과 한글뿐이다.
 *
 * 한글은 웨이트 하나가 500KB쯤 된다. 그래서 본문(400)과 강조(600) 두 종만 넣는다.
 * 라틴은 20KB대라 네 종을 다 넣어도 부담이 없다.
 */
import "@fontsource/ibm-plex-sans/latin-400.css"
import "@fontsource/ibm-plex-sans/latin-500.css"
import "@fontsource/ibm-plex-sans/latin-600.css"
import "@fontsource/ibm-plex-sans/latin-700.css"
import "@fontsource/ibm-plex-mono/latin-400.css"
import "@fontsource/ibm-plex-mono/latin-500.css"
import "@fontsource/ibm-plex-mono/latin-600.css"
import "@fontsource/ibm-plex-sans-kr/korean-400.css"
import "@fontsource/ibm-plex-sans-kr/korean-600.css"
