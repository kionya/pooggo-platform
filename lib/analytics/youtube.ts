import type { CompetitorContent } from './types'

const BASE_URL = 'https://www.googleapis.com/youtube/v3'

export async function fetchYouTubeContents(keyword: string): Promise<CompetitorContent[]> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY!

  // 1) 키워드로 영상 검색 (최대 10개)
  const searchUrl = `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(keyword + ' 시술')}&type=video&regionCode=KR&relevanceLanguage=ko&maxResults=10&key=${apiKey}`

  const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } })
  if (!searchRes.ok) {
    throw new Error(`YouTube Search API 오류: ${searchRes.status}`)
  }
  const searchJson = await searchRes.json()
  const items: Array<{
    id: { videoId: string }
    snippet: { title: string; channelTitle: string; publishedAt: string }
  }> = searchJson.items ?? []

  if (items.length === 0) return []

  // 2) 영상 ID 목록으로 조회수 일괄 조회
  const videoIds = items.map(i => i.id.videoId).join(',')
  const statsUrl = `${BASE_URL}/videos?part=statistics&id=${videoIds}&key=${apiKey}`

  const statsRes = await fetch(statsUrl, { next: { revalidate: 86400 } })
  if (!statsRes.ok) {
    throw new Error(`YouTube Videos API 오류: ${statsRes.status}`)
  }
  const statsJson = await statsRes.json()
  const statsMap: Record<string, number> = {}
  for (const v of statsJson.items ?? []) {
    statsMap[v.id] = parseInt(v.statistics?.viewCount ?? '0')
  }

  // 3) 검색결과 + 조회수 합쳐서 정렬
  const contents: CompetitorContent[] = items
    .map((item, idx) => ({
      rank: idx + 1,
      title: item.snippet.title,
      hospitalName: item.snippet.channelTitle,
      platform: 'YOUTUBE' as const,
      viewCount: statsMap[item.id.videoId] ?? 0,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      publishedAt: item.snippet.publishedAt,
    }))
    .sort((a, b) => b.viewCount - a.viewCount)
    .map((item, idx) => ({ ...item, rank: idx + 1 }))

  return contents
}
