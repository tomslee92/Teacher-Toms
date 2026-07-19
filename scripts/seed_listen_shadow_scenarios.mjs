// Seed the Listen/Shadow scenarios into a Supabase project. SELF-CONTAINED source of truth,
// regenerated from live prod data on 2026-07-19 (includes Hannah rename + female voice, other-person
// Korean glosses, removed closing recaps, and the aus3 job/purpose edits). Re-run to reset the set.
// Idempotent: clears is_starter + collection='narim-australia' scenarios (cascades lines/assignments)
// then re-inserts. Narim-Australia scenarios are re-assigned to Narim.
const BASE = "https://ulpnmewvejvpancvqnrp.supabase.co/rest/v1";
const KEY = process.env.REACT_APP_SUPABASE_KEY || "sb_publishable_sDP-kuCv5E2LmpDMPp8Y4A_n1ryWhNO";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const NARIM_ID = "3d9e3d96-f409-4274-bc06-f6a431ab0501";

const DATA = [
  {
    "title": "Getting to the Hotel",
    "category": "TAXI",
    "context_description": "기사님",
    "is_active": true,
    "is_starter": true,
    "collection": null,
    "sort_order": null,
    "other_voice_id": null,
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "other",
        "english_text": "Good evening! Where are you headed?",
        "korean_text": null
      },
      {
        "sequence_order": 2,
        "speaker": "student",
        "english_text": "Could you take us to the Grand Hotel?",
        "korean_text": "그랜드 호텔로 가주시겠어요?"
      },
      {
        "sequence_order": 3,
        "speaker": "other",
        "english_text": "Of course. It'll take about twenty minutes.",
        "korean_text": null
      },
      {
        "sequence_order": 4,
        "speaker": "student",
        "english_text": "How much will it cost, roughly?",
        "korean_text": "대략 얼마나 나올까요?"
      },
      {
        "sequence_order": 5,
        "speaker": "other",
        "english_text": "Around fifteen dollars, depending on traffic.",
        "korean_text": null
      },
      {
        "sequence_order": 6,
        "speaker": "student",
        "english_text": "Sounds good. Thank you!",
        "korean_text": "좋아요. 감사합니다!"
      }
    ]
  },
  {
    "title": "Meeting a New Coworker",
    "category": "SMALL TALK",
    "context_description": "Sarah",
    "is_active": true,
    "is_starter": true,
    "collection": null,
    "sort_order": null,
    "other_voice_id": null,
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "other",
        "english_text": "Hi, I don't think we've met. I'm Sarah.",
        "korean_text": null
      },
      {
        "sequence_order": 2,
        "speaker": "student",
        "english_text": "Nice to meet you! I just joined this week.",
        "korean_text": "만나서 반가워요! 이번 주에 입사했어요."
      },
      {
        "sequence_order": 3,
        "speaker": "other",
        "english_text": "Welcome! Which team are you on?",
        "korean_text": null
      },
      {
        "sequence_order": 4,
        "speaker": "student",
        "english_text": "I'm on the marketing team, third floor.",
        "korean_text": "3층 마케팅 팀이에요."
      },
      {
        "sequence_order": 5,
        "speaker": "other",
        "english_text": "Oh nice, we work together a lot.",
        "korean_text": null
      },
      {
        "sequence_order": 6,
        "speaker": "student",
        "english_text": "Great — looking forward to working with you.",
        "korean_text": "좋네요 — 같이 일하게 되어 기대돼요."
      }
    ]
  },
  {
    "title": "Ordering Coffee",
    "category": "CAFÉ",
    "context_description": "직원",
    "is_active": true,
    "is_starter": true,
    "collection": null,
    "sort_order": null,
    "other_voice_id": null,
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "other",
        "english_text": "Hi there! What can I get for you?",
        "korean_text": null
      },
      {
        "sequence_order": 2,
        "speaker": "student",
        "english_text": "Could I get an iced americano, please?",
        "korean_text": "아이스 아메리카노 한 잔 주시겠어요?"
      },
      {
        "sequence_order": 3,
        "speaker": "other",
        "english_text": "Sure. What size would you like?",
        "korean_text": null
      },
      {
        "sequence_order": 4,
        "speaker": "student",
        "english_text": "A large one, please. Not too much ice.",
        "korean_text": "큰 걸로 주세요. 얼음은 너무 많지 않게요."
      },
      {
        "sequence_order": 5,
        "speaker": "other",
        "english_text": "Got it. Anything else for you today?",
        "korean_text": null
      },
      {
        "sequence_order": 6,
        "speaker": "student",
        "english_text": "No, that's all. Thank you so much.",
        "korean_text": "아니요, 그게 다예요. 정말 감사해요."
      }
    ]
  },
  {
    "title": "Making a First Friend",
    "category": "MAKING FRIENDS · 1/5",
    "context_description": "Hannah",
    "is_active": true,
    "is_starter": false,
    "collection": "narim-australia",
    "sort_order": 1,
    "other_voice_id": "M7ya1YbaeFaPXljg9BpK",
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "student",
        "english_text": "오늘은 시드니 호스텔 라운지에서 처음 말을 거는 상황이에요. 편하게 듣기만 하세요.",
        "korean_text": ""
      },
      {
        "sequence_order": 2,
        "speaker": "student",
        "english_text": "Hi, mind if I join you?",
        "korean_text": "저 여기 앉아도 될까요?"
      },
      {
        "sequence_order": 3,
        "speaker": "other",
        "english_text": "Not at all, have a seat. I'm Hannah.",
        "korean_text": "그럼요, 앉으세요. 저는 한나예요."
      },
      {
        "sequence_order": 4,
        "speaker": "student",
        "english_text": "Nice to meet you, Hannah. I'm Narim.",
        "korean_text": "만나서 반가워요, 한나. 저는 나림이에요."
      },
      {
        "sequence_order": 5,
        "speaker": "other",
        "english_text": "Nice to meet you too. Where are you from?",
        "korean_text": "저도 반가워요. 어디서 오셨어요?"
      },
      {
        "sequence_order": 6,
        "speaker": "student",
        "english_text": "I'm from Korea. I just got here yesterday.",
        "korean_text": "한국에서 왔어요. 어제 막 도착했어요."
      },
      {
        "sequence_order": 7,
        "speaker": "other",
        "english_text": "Oh nice! How long are you staying?",
        "korean_text": "오 좋네요! 얼마나 계실 거예요?"
      },
      {
        "sequence_order": 8,
        "speaker": "student",
        "english_text": "About a month. How long have you been here?",
        "korean_text": "한 달 정도요. 여기 온 지 얼마나 됐어요?"
      },
      {
        "sequence_order": 9,
        "speaker": "other",
        "english_text": "Two weeks now. Sydney's amazing, you'll love it.",
        "korean_text": "이제 2주 됐어요. 시드니 정말 멋져요, 분명 좋아하실 거예요."
      },
      {
        "sequence_order": 10,
        "speaker": "student",
        "english_text": "I hope so. Any places I should check out?",
        "korean_text": "그러길 바라요. 가볼 만한 곳 있어요?"
      },
      {
        "sequence_order": 11,
        "speaker": "other",
        "english_text": "Definitely the coastal walk from Bondi. A few of us are going tomorrow.",
        "korean_text": "본다이 해안 산책 꼭 가보세요. 내일 몇 명이서 갈 거예요."
      },
      {
        "sequence_order": 12,
        "speaker": "student",
        "english_text": "That sounds fun. Mind if I join you?",
        "korean_text": "재밌겠네요. 저도 껴도 될까요?"
      },
      {
        "sequence_order": 13,
        "speaker": "other",
        "english_text": "Of course! We're meeting in the lobby at ten.",
        "korean_text": "물론이죠! 10시에 로비에서 만나요."
      },
      {
        "sequence_order": 14,
        "speaker": "student",
        "english_text": "Perfect. See you at ten then.",
        "korean_text": "좋아요. 그럼 10시에 봐요."
      }
    ]
  },
  {
    "title": "Joining a Group Activity",
    "category": "MAKING FRIENDS · 2/5",
    "context_description": "Hannah",
    "is_active": true,
    "is_starter": false,
    "collection": "narim-australia",
    "sort_order": 2,
    "other_voice_id": "M7ya1YbaeFaPXljg9BpK",
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "student",
        "english_text": "호스텔 사람들과 본다이 해안 산책을 하는 상황이에요. 함께하고 싶을 때 쓰는 표현이 나와요.",
        "korean_text": ""
      },
      {
        "sequence_order": 2,
        "speaker": "other",
        "english_text": "Hey, you're from the hostel too, right? I'm Hannah.",
        "korean_text": "안녕하세요, 그쪽도 호스텔에서 오셨죠? 저는 한나예요."
      },
      {
        "sequence_order": 3,
        "speaker": "student",
        "english_text": "Yes! I'm Narim. Is this your first time on this walk?",
        "korean_text": "네! 저는 나림이에요. 이 산책은 처음이에요?"
      },
      {
        "sequence_order": 4,
        "speaker": "other",
        "english_text": "First time, yeah. The view is unreal.",
        "korean_text": "네, 저도 처음이에요. 경치가 정말 장난 아니에요."
      },
      {
        "sequence_order": 5,
        "speaker": "student",
        "english_text": "Same here. I can't stop taking photos.",
        "korean_text": "저도요. 사진을 멈출 수가 없어요."
      },
      {
        "sequence_order": 6,
        "speaker": "other",
        "english_text": "Ha, same here. Are you traveling alone?",
        "korean_text": "하하, 저도요. 혼자 여행하세요?"
      },
      {
        "sequence_order": 7,
        "speaker": "student",
        "english_text": "I am. It's a little scary, but exciting.",
        "korean_text": "네. 조금 무섭지만 설레요."
      },
      {
        "sequence_order": 8,
        "speaker": "other",
        "english_text": "I get that. Solo travel is the best way to meet people though.",
        "korean_text": "이해해요. 그래도 혼자 하는 여행이 사람 사귀기엔 제일 좋아요."
      },
      {
        "sequence_order": 9,
        "speaker": "student",
        "english_text": "That's what I'm hoping for.",
        "korean_text": "저도 그러길 바라고 있어요."
      },
      {
        "sequence_order": 10,
        "speaker": "other",
        "english_text": "A bunch of us are grabbing fish and chips after. You in?",
        "korean_text": "이따 다 같이 피시앤칩스 먹으러 갈 건데, 같이 갈래요?"
      },
      {
        "sequence_order": 11,
        "speaker": "student",
        "english_text": "Count me in!",
        "korean_text": "저도 갈래요!"
      },
      {
        "sequence_order": 12,
        "speaker": "other",
        "english_text": "Nice. And Sunday we're doing a surfing lesson, if you want.",
        "korean_text": "좋아요. 그리고 원하면 일요일에 서핑 수업도 있어요."
      },
      {
        "sequence_order": 13,
        "speaker": "student",
        "english_text": "A surfing lesson? Count me in for that too.",
        "korean_text": "서핑 수업이요? 그것도 갈래요."
      }
    ]
  },
  {
    "title": "Getting to Know Someone",
    "category": "MAKING FRIENDS · 3/5",
    "context_description": "Hannah",
    "is_active": true,
    "is_starter": false,
    "collection": "narim-australia",
    "sort_order": 3,
    "other_voice_id": "M7ya1YbaeFaPXljg9BpK",
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "student",
        "english_text": "산책 후에 다 같이 피시앤칩스를 먹으면서 서로를 더 알아가는 상황이에요.",
        "korean_text": ""
      },
      {
        "sequence_order": 2,
        "speaker": "other",
        "english_text": "So Narim, what do you do back home?",
        "korean_text": "나림 씨, 한국에서는 무슨 일 하세요?"
      },
      {
        "sequence_order": 3,
        "speaker": "student",
        "english_text": "I direct and edit videos for clients at a production company in Seoul. What about you?",
        "korean_text": "서울의 영상 제작사에서 클라이언트 영상을 연출하고 편집해요. 당신은요?"
      },
      {
        "sequence_order": 4,
        "speaker": "other",
        "english_text": "I'm a nurse. I'm taking a break before a new job.",
        "korean_text": "저는 간호사예요. 새 직장 시작하기 전에 좀 쉬고 있어요."
      },
      {
        "sequence_order": 5,
        "speaker": "student",
        "english_text": "That's brave. I've always wanted to take a long break like this.",
        "korean_text": "용감하네요. 저도 늘 이런 긴 휴식을 원했어요."
      },
      {
        "sequence_order": 6,
        "speaker": "other",
        "english_text": "Well, you're doing it right now!",
        "korean_text": "지금 그렇게 하고 계시잖아요!"
      },
      {
        "sequence_order": 7,
        "speaker": "student",
        "english_text": "True! I've always wanted to see Australia, and here I am.",
        "korean_text": "맞아요! 늘 호주에 와보고 싶었는데, 드디어 왔네요."
      },
      {
        "sequence_order": 8,
        "speaker": "other",
        "english_text": "What made you choose Australia?",
        "korean_text": "왜 호주를 골랐어요?"
      },
      {
        "sequence_order": 9,
        "speaker": "student",
        "english_text": "Honestly, to make new friends. I'm here on a working holiday, and I want to meet as many people as I can.",
        "korean_text": "솔직히 새 친구를 사귀려고요. 워킹홀리데이로 왔는데, 최대한 많은 사람들을 만나고 싶어요."
      },
      {
        "sequence_order": 10,
        "speaker": "other",
        "english_text": "Your English is great, honestly.",
        "korean_text": "솔직히 영어 정말 잘하세요."
      },
      {
        "sequence_order": 11,
        "speaker": "student",
        "english_text": "Thank you, that means a lot. What about you, where to next?",
        "korean_text": "고마워요, 큰 힘이 돼요. 당신은 다음에 어디로 가요?"
      },
      {
        "sequence_order": 12,
        "speaker": "other",
        "english_text": "New Zealand, maybe. We'll see.",
        "korean_text": "아마 뉴질랜드요. 아직 모르겠어요."
      }
    ]
  },
  {
    "title": "When You Don't Understand",
    "category": "MAKING FRIENDS · 4/5",
    "context_description": "Hannah",
    "is_active": true,
    "is_starter": false,
    "collection": "narim-australia",
    "sort_order": 4,
    "other_voice_id": "M7ya1YbaeFaPXljg9BpK",
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "student",
        "english_text": "이번엔 상대방 말을 못 알아들었을 때 자연스럽게 되묻는 상황이에요. 여행에서 제일 쓸모 있을 거예요.",
        "korean_text": ""
      },
      {
        "sequence_order": 2,
        "speaker": "other",
        "english_text": "We're heading to Manly this arvo. Wanna come?",
        "korean_text": "오늘 오후에 맨리 갈 건데, 같이 갈래요?"
      },
      {
        "sequence_order": 3,
        "speaker": "student",
        "english_text": "Sorry, could you say that again?",
        "korean_text": "죄송한데 다시 한 번 말해줄래요?"
      },
      {
        "sequence_order": 4,
        "speaker": "other",
        "english_text": "We're going to Manly beach this arvo.",
        "korean_text": "오늘 오후에 맨리 해변에 가요."
      },
      {
        "sequence_order": 5,
        "speaker": "student",
        "english_text": "What does \"arvo\" mean?",
        "korean_text": "\"arvo\"가 무슨 뜻이에요?"
      },
      {
        "sequence_order": 6,
        "speaker": "other",
        "english_text": "Oh, it's Aussie slang for afternoon.",
        "korean_text": "아, 오후를 뜻하는 호주 슬랭이에요."
      },
      {
        "sequence_order": 7,
        "speaker": "student",
        "english_text": "Got it! Then yes, I'd love to come.",
        "korean_text": "알겠어요! 그럼 저도 갈래요."
      },
      {
        "sequence_order": 8,
        "speaker": "other",
        "english_text": "Sweet. It's heaps nice there this time of year.",
        "korean_text": "좋아요. 이맘때 거기 정말 좋아요."
      },
      {
        "sequence_order": 9,
        "speaker": "student",
        "english_text": "\"Heaps\"? What does that mean?",
        "korean_text": "\"heaps\"는 무슨 뜻이에요?"
      },
      {
        "sequence_order": 10,
        "speaker": "other",
        "english_text": "Ha, it means \"very\" or \"a lot\". You'll hear it heaps.",
        "korean_text": "하하, '아주' 또는 '많이'라는 뜻이에요. 앞으로 엄청 자주 들을 거예요."
      },
      {
        "sequence_order": 11,
        "speaker": "student",
        "english_text": "Got it. Australians have their own English!",
        "korean_text": "알겠어요. 호주만의 영어가 있네요!"
      },
      {
        "sequence_order": 12,
        "speaker": "other",
        "english_text": "We do speak fast sometimes. Just ask anytime.",
        "korean_text": "저희가 가끔 빨리 말하긴 해요. 언제든 물어보세요."
      },
      {
        "sequence_order": 13,
        "speaker": "student",
        "english_text": "Thanks. Sorry, could you say the meeting time again?",
        "korean_text": "고마워요. 죄송한데 모이는 시간 다시 말해줄래요?"
      },
      {
        "sequence_order": 14,
        "speaker": "other",
        "english_text": "Two o'clock, at the wharf.",
        "korean_text": "2시에, 부두에서요."
      }
    ]
  },
  {
    "title": "Making Plans to Meet Again",
    "category": "MAKING FRIENDS · 5/5",
    "context_description": "Hannah",
    "is_active": true,
    "is_starter": false,
    "collection": "narim-australia",
    "sort_order": 5,
    "other_voice_id": "M7ya1YbaeFaPXljg9BpK",
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "student",
        "english_text": "마지막 상황이에요. 오늘 만난 친구와 다음 약속을 잡는 상황이에요.",
        "korean_text": ""
      },
      {
        "sequence_order": 2,
        "speaker": "other",
        "english_text": "Today was so fun. We should hang out again before you leave.",
        "korean_text": "오늘 정말 즐거웠어요. 떠나기 전에 또 만나요."
      },
      {
        "sequence_order": 3,
        "speaker": "student",
        "english_text": "Definitely, we should! Are you free on Saturday?",
        "korean_text": "꼭 그래요! 토요일에 시간 있어요?"
      },
      {
        "sequence_order": 4,
        "speaker": "other",
        "english_text": "Saturday works. There's a night market in Chinatown.",
        "korean_text": "토요일 괜찮아요. 차이나타운에 야시장이 있어요."
      },
      {
        "sequence_order": 5,
        "speaker": "student",
        "english_text": "Perfect, I love night markets. Add me on Instagram?",
        "korean_text": "좋아요, 야시장 완전 좋아해요. 인스타 맞팔할래요?"
      },
      {
        "sequence_order": 6,
        "speaker": "other",
        "english_text": "Sure, what's your handle?",
        "korean_text": "좋아요, 아이디가 뭐예요?"
      },
      {
        "sequence_order": 7,
        "speaker": "student",
        "english_text": "It's narim underscore travels. I'll follow you back.",
        "korean_text": "narim_travels예요. 맞팔할게요."
      },
      {
        "sequence_order": 8,
        "speaker": "other",
        "english_text": "Done! I'll message you about Saturday.",
        "korean_text": "됐어요! 토요일 관련해서 메시지 보낼게요."
      },
      {
        "sequence_order": 9,
        "speaker": "student",
        "english_text": "Sounds good. And are you free on Sunday for the surfing lesson?",
        "korean_text": "좋아요. 일요일 서핑 수업도 시간 돼요?"
      },
      {
        "sequence_order": 10,
        "speaker": "other",
        "english_text": "Ha, you're really going for it. Yes, I'm in.",
        "korean_text": "하하, 정말 열심이시네요. 네, 저도 갈게요."
      },
      {
        "sequence_order": 11,
        "speaker": "student",
        "english_text": "Great. We should hang out as much as we can!",
        "korean_text": "좋아요. 있는 동안 최대한 자주 놀아요!"
      }
    ]
  },
  {
    "title": "Getting the Job",
    "category": "CAFÉ JOB · 1/3",
    "context_description": "직원",
    "is_active": true,
    "is_starter": false,
    "collection": "narim-australia",
    "sort_order": 6,
    "other_voice_id": "M7ya1YbaeFaPXljg9BpK",
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "student",
        "english_text": "이제 카페 알바 준비예요. 지나가다 구인 공고를 보고 직접 물어보는 상황이에요.",
        "korean_text": ""
      },
      {
        "sequence_order": 2,
        "speaker": "student",
        "english_text": "Hi, excuse me. I saw your sign outside. Are you hiring?",
        "korean_text": "실례합니다. 밖에 공고를 봤는데, 직원 구하세요?"
      },
      {
        "sequence_order": 3,
        "speaker": "other",
        "english_text": "We are! Summer's busy, so we're always hiring around now.",
        "korean_text": "네 구해요! 여름엔 바빠서 이맘때 늘 사람을 뽑아요."
      },
      {
        "sequence_order": 4,
        "speaker": "student",
        "english_text": "Great. I'd love to apply. I have café experience in Korea.",
        "korean_text": "잘됐네요. 지원하고 싶어요. 한국에서 카페 경험이 있어요."
      },
      {
        "sequence_order": 5,
        "speaker": "other",
        "english_text": "Nice. Can you leave your resume with me?",
        "korean_text": "좋아요. 이력서 주고 가실래요?"
      },
      {
        "sequence_order": 6,
        "speaker": "student",
        "english_text": "Sure, here it is. I'm on a working holiday visa.",
        "korean_text": "네, 여기요. 워킹홀리데이 비자로 왔어요."
      },
      {
        "sequence_order": 7,
        "speaker": "other",
        "english_text": "Perfect. When are you available to start?",
        "korean_text": "좋네요. 언제부터 시작할 수 있어요?"
      },
      {
        "sequence_order": 8,
        "speaker": "student",
        "english_text": "I'm available right away, any day of the week.",
        "korean_text": "바로 시작할 수 있어요. 요일 상관없어요."
      },
      {
        "sequence_order": 9,
        "speaker": "other",
        "english_text": "Good to know. Have you used an espresso machine before?",
        "korean_text": "알겠어요. 에스프레소 머신 써본 적 있어요?"
      },
      {
        "sequence_order": 10,
        "speaker": "student",
        "english_text": "Yes, and I'd love to learn your menu too.",
        "korean_text": "네, 여기 메뉴도 배우고 싶어요."
      },
      {
        "sequence_order": 11,
        "speaker": "other",
        "english_text": "Lovely. The manager will call you this week.",
        "korean_text": "좋아요. 이번 주에 매니저가 전화드릴 거예요."
      },
      {
        "sequence_order": 12,
        "speaker": "student",
        "english_text": "Thank you so much. I look forward to it.",
        "korean_text": "정말 감사해요. 기다리고 있을게요."
      }
    ]
  },
  {
    "title": "Your First Shift",
    "category": "CAFÉ JOB · 2/3",
    "context_description": "손님",
    "is_active": true,
    "is_starter": false,
    "collection": "narim-australia",
    "sort_order": 7,
    "other_voice_id": "M7ya1YbaeFaPXljg9BpK",
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "student",
        "english_text": "첫 근무예요. 이번엔 나림 씨가 주문을 받는 쪽이에요.",
        "korean_text": ""
      },
      {
        "sequence_order": 2,
        "speaker": "student",
        "english_text": "Hi, what can I get for you?",
        "korean_text": "안녕하세요, 뭐 드릴까요?"
      },
      {
        "sequence_order": 3,
        "speaker": "other",
        "english_text": "Can I get a large flat white, please?",
        "korean_text": "플랫화이트 큰 걸로 하나 주세요."
      },
      {
        "sequence_order": 4,
        "speaker": "student",
        "english_text": "Sure. For here or takeaway?",
        "korean_text": "네. 드시고 가세요, 가져가세요?"
      },
      {
        "sequence_order": 5,
        "speaker": "other",
        "english_text": "Takeaway, thanks.",
        "korean_text": "가져갈게요, 감사합니다."
      },
      {
        "sequence_order": 6,
        "speaker": "student",
        "english_text": "Anything else for you?",
        "korean_text": "더 필요한 건 없으세요?"
      },
      {
        "sequence_order": 7,
        "speaker": "other",
        "english_text": "Hmm, is the banana bread good?",
        "korean_text": "음, 바나나 브레드 맛있어요?"
      },
      {
        "sequence_order": 8,
        "speaker": "student",
        "english_text": "It's really popular. We toast it with butter.",
        "korean_text": "정말 인기 많아요. 버터에 구워드려요."
      },
      {
        "sequence_order": 9,
        "speaker": "other",
        "english_text": "Go on then, one of those too.",
        "korean_text": "그럼 그것도 하나 주세요."
      },
      {
        "sequence_order": 10,
        "speaker": "student",
        "english_text": "Great. That's twelve dollars altogether.",
        "korean_text": "좋아요. 전부 12달러예요."
      },
      {
        "sequence_order": 11,
        "speaker": "other",
        "english_text": "Here you go. Oh — actually, can you make it two flat whites?",
        "korean_text": "여기요. 아 — 그런데, 플랫화이트 두 잔으로 해줄 수 있어요?"
      },
      {
        "sequence_order": 12,
        "speaker": "student",
        "english_text": "No worries. Anything else with that?",
        "korean_text": "괜찮아요. 더 필요한 건요?"
      },
      {
        "sequence_order": 13,
        "speaker": "other",
        "english_text": "No, that's everything.",
        "korean_text": "아니요, 그게 다예요."
      },
      {
        "sequence_order": 14,
        "speaker": "student",
        "english_text": "Both takeaway as well? They're coming right up.",
        "korean_text": "둘 다 테이크아웃이죠? 바로 준비해드릴게요."
      },
      {
        "sequence_order": 15,
        "speaker": "other",
        "english_text": "Yes please. Thanks so much.",
        "korean_text": "네 부탁해요. 정말 감사합니다."
      },
      {
        "sequence_order": 16,
        "speaker": "student",
        "english_text": "Two flat whites, coming right up!",
        "korean_text": "플랫화이트 두 잔, 바로 나갑니다!"
      }
    ]
  },
  {
    "title": "Making Friends at Work",
    "category": "CAFÉ JOB · 3/3",
    "context_description": "Hannah",
    "is_active": true,
    "is_starter": false,
    "collection": "narim-australia",
    "sort_order": 8,
    "other_voice_id": "M7ya1YbaeFaPXljg9BpK",
    "lines": [
      {
        "sequence_order": 1,
        "speaker": "student",
        "english_text": "마감 시간이에요. 동료와 자연스럽게 가까워지는 상황이에요.",
        "korean_text": ""
      },
      {
        "sequence_order": 2,
        "speaker": "student",
        "english_text": "Hey Hannah, do you want a hand with the dishes?",
        "korean_text": "한나, 설거지 도와줄까요?"
      },
      {
        "sequence_order": 3,
        "speaker": "other",
        "english_text": "That'd be great, thanks. How's your first week going?",
        "korean_text": "그럼 좋죠, 고마워요. 첫 주는 어때요?"
      },
      {
        "sequence_order": 4,
        "speaker": "student",
        "english_text": "It's going well. I'm getting faster with the coffee machine.",
        "korean_text": "잘 지내고 있어요. 커피 머신도 점점 빨라지고요."
      },
      {
        "sequence_order": 5,
        "speaker": "other",
        "english_text": "You're doing great. The regulars like you already.",
        "korean_text": "정말 잘하고 있어요. 단골손님들이 벌써 좋아해요."
      },
      {
        "sequence_order": 6,
        "speaker": "student",
        "english_text": "Really? That makes me so happy.",
        "korean_text": "정말요? 너무 기뻐요."
      },
      {
        "sequence_order": 7,
        "speaker": "other",
        "english_text": "How's it going with the till? It confused me at first.",
        "korean_text": "계산대는 좀 어때요? 저도 처음엔 헷갈렸어요."
      },
      {
        "sequence_order": 8,
        "speaker": "student",
        "english_text": "Honestly, still a little confusing. Can I ask you when I'm stuck?",
        "korean_text": "솔직히 아직 좀 헷갈려요. 막히면 물어봐도 돼요?"
      },
      {
        "sequence_order": 9,
        "speaker": "other",
        "english_text": "Of course, anytime. Do you want a hand closing up?",
        "korean_text": "물론이죠, 언제든지요. 마감 도와줄까요?"
      },
      {
        "sequence_order": 10,
        "speaker": "student",
        "english_text": "Sure! Then we can leave together.",
        "korean_text": "좋아요! 그럼 같이 퇴근해요."
      },
      {
        "sequence_order": 11,
        "speaker": "other",
        "english_text": "Deal. Some of us get dumplings after Friday shifts. Come along!",
        "korean_text": "좋아요. 금요일 근무 끝나고 몇 명이서 만두 먹으러 가요. 같이 가요!"
      },
      {
        "sequence_order": 12,
        "speaker": "student",
        "english_text": "I'd love that. See you tomorrow, Hannah.",
        "korean_text": "좋아요. 내일 봐요, 한나."
      },
      {
        "sequence_order": 13,
        "speaker": "other",
        "english_text": "See you tomorrow. Great work today.",
        "korean_text": "내일 봐요. 오늘 수고했어요."
      }
    ]
  }
];

const post = async (t, b, prefer = "return=representation") => { const r = await fetch(`${BASE}/${t}`, { method: "POST", headers: { ...H, Prefer: prefer }, body: JSON.stringify(b) }); if (!r.ok) throw new Error(`${t} ${r.status}: ${await r.text()}`); const x = await r.text(); return x ? JSON.parse(x) : null; };
const del = async (q) => { const r = await fetch(`${BASE}/scenarios?${q}`, { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } }); if (!r.ok) throw new Error(`DEL ${r.status}`); };
const one = (r) => (Array.isArray(r) ? r[0] : r);

const run = async () => {
  await del("is_starter=eq.true");
  await del("collection=eq.narim-australia");
  for (const d of DATA) {
    const { lines, ...scenario } = d;
    const sc = one(await post("scenarios", { ...scenario, created_by: "seed" }));
    await post("scenario_lines", lines.map(l => ({ ...l, scenario_id: sc.id })), "return=minimal");
    if (d.collection === "narim-australia") await post("scenario_assignments", { scenario_id: sc.id, student_id: NARIM_ID, group_id: null }, "return=minimal");
    console.log(`  ${d.is_starter ? "starter" : "aus" + d.sort_order} "${d.title}" — ${lines.length} lines`);
  }
  console.log("\ndone.");
};
run().catch(e => { console.error("SEED FAILED:", e.message); process.exit(1); });
