const { fetchBuzzfeedHealthNews } = require('./sources/buzzfeed-health');
const { fetchBuzzfeedPoliticsNews } = require('./sources/buzzfeed-politics');
const { fetchEconomistFinanceNews } = require('./sources/economist-finance');
const {
  fetchFinancialTimesAfricaNews,
} = require('./sources/financialtimes-africa');
const {
  fetchFinancialTimesGlobalEconomyNews,
} = require('./sources/financialtimes-globaleconomy');
const {
  fetchFinancialTimesWorldNews,
} = require('./sources/financialtimes-world');
const { fetchGlamourHealthNews } = require('./sources/glamour-health');
const { fetchGuardianHealthNews } = require('./sources/guardian-health');
const { fetchGuardianWellbeingNews } = require('./sources/guardian-wellbeing');
const { fetchLATimesWorldNews } = require('./sources/latimes-world');
const { fetchLifeHackerHealthNews } = require('./sources/lifehacker-health');
const { fetchNBCNewsGeneralNews } = require('./sources/nbcnews-world');
const { fetchExpressScienceNews } = require('./sources/daily-express-science');
const { fetchCNETNews } = require('./sources/cnet-news');
const {
  fetchExpressFootballNews,
} = require('./sources/daily-express-football');
const {
  fetchNewScientistHealthNews,
} = require('./sources/newscientist-health');
const {
  fetchNewYorkTimesAfricaNews,
} = require('./sources/newyorktimes-africa');
const {
  fetchNewYorkTimesBusinessNews,
} = require('./sources/newyorktimes-business');
const {
  fetchNewYorkTimesSoccerNews,
} = require('./sources/newyorktimes-football');
const { fetchNewYorkTimesTechNews } = require('./sources/newyorktimes-tech');
const { fetchNewYorkTimesWorldNews } = require('./sources/newyorktimes-world');
const { fetchNPRGeneralNews } = require('./sources/npr-us');
const { fetchTimeHealthNews } = require('./sources/time-health');
const { fetchHuffPostUKNews } = require('./sources/huffpost-uk');
const {
  fetchWallStreetJournalMarketsNews,
} = require('./sources/wallstreetjournal-market');
const {
  fetchWallStreetJournalTechNews,
} = require('./sources/wallstreetjournal-tech');
const {
  fetchWallStreetJournalUSBusinessNews,
} = require('./sources/wallstreetjournal-usbusiness');
const {
  fetchWallStreetJournalWorldNews,
} = require('./sources/wallstreetjournal-world');
const { fetchYahooHealthNews } = require('./sources/yahoo-health');
const { fetchYahooWorldNews } = require('./sources/yahoo-world');
const { fetchBBCSportFootballNews } = require('./sources/bbc-football');
const { fetchBBCNews } = require('./sources/bbc-topstories');
const { fetchBBCWorldNews } = require('./sources/bbc-world');
const { fetchBBCBusinessNews } = require('./sources/bbc-business');
const { fetchBBCPoliticsNews } = require('./sources/bbc-politics');
const { fetchBBCScienceEnvironmentNews } = require('./sources/bbc-science');
const { fetchBBCTechnologyNews } = require('./sources/bbc-tech');
const { fetchSkyNewsWorld } = require('./sources/sky-uk-world');
const { fetchSkyNewsBusiness } = require('./sources/sky-uk-business');
const { fetchSkyNewsPolitics } = require('./sources/sky-uk-politics');
const { fetchSkyNewsTechnology } = require('./sources/sky-uk-tech');
const { fetchFrance24News } = require('./sources/france-24-world');
const { fetchFrance24Africa } = require('./sources/france-24-africa');
const { fetchFrance24Business } = require('./sources/france-24-business');
const { fetchFrance24Sports } = require('./sources/france-24-sports');
const { fetchFrance24Earth } = require('./sources/france-24-earth');
const { fetchFrance24Culture } = require('./sources/france-24-culture');
const { fetchDWWorldNews } = require('./sources/dw-world');
const { fetchDWBusinessNews } = require('./sources/dw-business');
const { fetchDWTopStories } = require('./sources/dw-topstories');
const { fetchDWSports } = require('./sources/dw-sports');
const { fetchDWCulture } = require('./sources/dw-culture');
const { fetchDWScience } = require('./sources/dw-science');
const { fetchRTNews } = require('./sources/rt-world');
const { fetchEyeFootballNews } = require('./sources/eye-football');
const { fetchRTRussia } = require('./sources/rt-russia');
const {
  fetchGuardianBarcelonaNews,
} = require('./sources/guardian-uk-barcelona');
const { fetchRTBusiness } = require('./sources/rt-business');
const { fetchRCCeltaNews } = require('./sources/rc-celta');
const { fetchIndependentWorldNews } = require('./sources/independent-uk-world');
const { fetchGuardianFootballNews } = require('./sources/guardian-uk-football');
const { fetchGuardianScienceNews } = require('./sources/guardian-uk-science');
const { fetchGuardianUKSportNews } = require('./sources/guardian-uk-sports');
const { fetchMENSportNews } = require('./sources/manchester-evening-sports');
const { fetchMyLondonNews } = require('./sources/mylondon-news');
const { fetchMyLondonSportNews } = require('./sources/mylondon-sports');
const { fetchDailyMailNews } = require('./sources/daily-mail-news');
const { fetchDailyMailSportNews } = require('./sources/daily-mail-sports');
const { fetchDailyMailSciTechNews } = require('./sources/daily-mail-science');
const { fetchDailyMailTravelNews } = require('./sources/daily-mail-travel');
const { fetchScotsmanNews } = require('./sources/the-scotsman');
const { fetchDailyRecordNews } = require('./sources/daily-record');
const { fetchChannel4News } = require('./sources/channel-4');
const { fetchEveningStandardNews } = require('./sources/standard-uk');
const { fetchHeraldScotlandNews } = require('./sources/herald-scotland');
const { fetchMetroNews } = require('./sources/metro-uk');
const { fetchExpressWorldNews } = require('./sources/daily-express');
const { fetchExpressAfricaNews } = require('./sources/daily-express-africa');
const { fetchExpressAsiaNews } = require('./sources/daily-express-asia');
const { fetchAJPlusNews } = require('./sources/aj-plus');
const { fetchManUtdNews } = require('./sources/man-united');
const { fetchIndependentNGNews } = require('./sources/independent-nigeria');
const { fetchAJAMNews } = require('./sources/aljazeera-america');
const { fetchMiddleEastMonitorNews } = require('./sources/middle-east-monitor');
const { fetchMiddleEastEyeNews } = require('./sources/middle-east-eye');
const { fetchCGTNChinaNews } = require('./sources/cgtn-china');
const { fetchCGTNWorldNews } = require('./sources/cgtn-world');
const { fetchLaLigaNews } = require('./sources/laliga-news');
const { fetchToriNGNews } = require('./sources/tori-nigeria');
const { fetchESPNBoxingNews } = require('./sources/espn-boxing');
const { fetchESPNNews } = require('./sources/espn-top-headlines');
const {
  fetchSportsMoleBarcelonaNews,
} = require('./sources/sports-mole-barcelona');
const { fetchCGTNBusinessNews } = require('./sources/cgtn-business');
const { fetchCGTNTechSciNews } = require('./sources/cgtn-tech');
const { fetchCGTNTravelNews } = require('./sources/cgtn-travel');
const { fetchChinaDailyWorldNews } = require('./sources/china-daily-world');
const { fetchSCMPNews } = require('./sources/scmp-defense');
const { fetchSCMPAfricaNews } = require('./sources/scmp-africa');
const { fetchSCMPChinaNews } = require('./sources/scmp-business');
const { fetchSCMPAsiaNews } = require('./sources/scmp-tech');
const { fetchFootballItaliaNews } = require('./sources/football-italia');
const { fetchMarcaEnglishNews } = require('./sources/marca');
const { fetchITNewsAfrica } = require('./sources/it-news-africa');
const { fetchSCMPPoliticsNews } = require('./sources/scmp-news');
const { fetchXinhuaWorldNews } = require('./sources/xinhua-world');
const { fetchXinhuaBusinessNews } = require('./sources/xinhua-business');
const { fetchMashableNews } = require('./sources/mashable-tech');
const { fetchAfricaNews } = require('./sources/africanews');
const { fetchSaharaFootballNews } = require('./sources/sahara-football');
const { fetchTechCrunchNews } = require('./sources/techcrunch');
const { fetchTheNextWebNews } = require('./sources/the-next-web');
const { fetchTheVergeNews } = require('./sources/the-verge');
const { fetchTechRadar } = require('./sources/techradar-articles');
const { fetchTechRadarNews } = require('./sources/techradar-news');
const { fetchPCWorldNews } = require('./sources/pc-world');
const { fetch90MinNews } = require('./sources/90-min');
const { fetchDailyPostNews } = require('./sources/daily-post-nigeria');
const { fetchNFFNews } = require('./sources/the-nff');
const { fetchChannelsTVNews } = require('./sources/channels-nigeria');
const { fetchLaLigaExpertNews } = require('./sources/laliga-expert');
const { fetchEngadgetNews } = require('./sources/engadget');
const { fetchAndroidAuthorityNews } = require('./sources/android-authority');
const { fetchArsTechnicaTechLab } = require('./sources/ars-technica');
const { fetchAndroidCentralNews } = require('./sources/android-central');
const { fetchGSMArenaNews } = require('./sources/gsm-arena');
const { fetch9to5MacNews } = require('./sources/9to5mac');
const { fetchWindowsCentralNews } = require('./sources/windows-central');
const { fetchGreatGoalsNews } = require('./sources/101-great-goals');
const { fetchAppleNewsroom } = require('./sources/apple');
const { fetchPMNews } = require('./sources/pm-news-nigeria');
const { fetchPremiumTimesNews } = require('./sources/premiumtimes-nigeria');
const { fetchYahooSportsNews } = require('./sources/yahoo-sports');
const { fetchIMoreNews } = require('./sources/imore');
const { fetchCBSSportsNews } = require('./sources/cbs-sports');
const { fetchSportEsNews } = require('./sources/sport-english');
const { fetchAppleInsiderNews } = require('./sources/apple-insider');
const { fetchSamsungGlobalNews } = require('./sources/samsung');
const { fetchTalkChelseaNews } = require('./sources/talk-chelsea');
const { fetchJuveFCNews } = require('./sources/juvefc');
const { fetchGhanaSoccernetNews } = require('./sources/ghanasoccernet');
const { fetchArseblogNews } = require('./sources/arseblog');
const { fetchVanguardNews } = require('./sources/vanguard');
const { fetchSkySportsPremierLeagueNews } = require('./sources/sky-sports');
const { fetchManagingMadridNews } = require('./sources/managing-madrid');
const { fetchLaLigaBlogNews } = require('./sources/laliga-blog');
const { fetchAfricanExaminerNews } = require('./sources/africa-examiner');
const { fetchCultOfCalcioNews } = require('./sources/cult-of-calcio');
const { fetchGuardianNgNews } = require('./sources/guardian-nigeria');
const { fetchIOLNews } = require('./sources/iol-za');
const { fetchSowetanLiveNews } = require('./sources/sowetan-live');
const { fetchTechCentralNews } = require('./sources/tech-central-za');
const { fetchMailGuardianNews } = require('./sources/mail-and-guardian-za');
const { fetchDailyMaverickNews } = require('./sources/daily-maverick-za');
const { fetchAfricanInsiderNews } = require('./sources/african-insider');
const {
  fetchFrenchFootballWeeklyNews,
} = require('./sources/french-football-weekly');
const { fetchThisIsAnfieldNews } = require('./sources/this-is-anfield');
const { fetchEmpireOfTheKopNews } = require('./sources/empire-of-kop');
const { fetchNUFCBlogNews } = require('./sources/nufc-blog');
const { fetchBarcaUniversalNews } = require('./sources/barca-universal');
const { fetchRomaPressNews } = require('./sources/roma-press');
const { fetchToffeeWebNews } = require('./sources/toffeeweb');
const { fetchSBISoccerNews } = require('./sources/sbi-soccer');
const { fetchAmeyawDebrahNews } = require('./sources/ameyaw-debrah');
const { fetchGhanaianChronicleNews } = require('./sources/ghanaian-chronicle');
const { fetchSixSportsNews } = require('./sources/six-sports');
const { fetchConstructAfricaNews } = require('./sources/construct-africa');
const {
  fetchAfricanEntertainmentNews,
} = require('./sources/african-entertainment');
const { fetchIntoTheCalderonNews } = require('./sources/into-the-calderon');
const { fetchRealMadridNews } = require('./sources/real-madrid-news');
const { fetchTheKopTimesNews } = require('./sources/the-kop-times');
const {
  fetchAfricaIntelligenceNews,
} = require('./sources/africa-intelligence');
const { fetchFootballEspanaNews } = require('./sources/football-espana');
const { fetchESPNSoccerNews } = require('./sources/espn-soccer');
const { fetchTheSouthAfricanNews } = require('./sources/the-southafrican');
const { fetchBarcaBlaugranesNews } = require('./sources/barca-blaugranes');
const { fetchAfricanMirrorNews } = require('./sources/african-mirror');
const {
  fetchGermanFootballNews,
} = require('./sources/get-football-news-germany');
const { fetchBundesligaFanNews } = require('./sources/bundesliga-fan');
const { fetchStarsAndStripesFCNews } = require('./sources/stars-and-stripe');
const {
  fetchChinaDailyBizChinaNews,
} = require('./sources/china-daily-business');
const { fetchChinaDailyChinaNews } = require('./sources/china-daily');
const { fetchConverseerNews } = require('./sources/converseer-nigeria');
const { fetchCaughtOffsideNews } = require('./sources/caught-offside');
const { fetchTheMagNews } = require('./sources/the-mag');
const { fetchTheBureauNews } = require('./sources/the-bureau-nigeria');
const { fetchESPNNBANews } = require('./sources/espn-nba');
const { fetchLeadershipNGNews } = require('./sources/leadership-nigeria');
const { fetchRipplesNGNews } = require('./sources/ripples-nigeria');
const { fetchDailyNigerianNews } = require('./sources/daily-nigerian');
const { fetchNigerianEyeNews } = require('./sources/nigerian-eye');
const { fetchCitizenNews } = require('./sources/citizen-za');
const { fetchAccraMailNews } = require('./sources/accra-mail');
const { fetchBellaNaijaNews } = require('./sources/bella-naija');
const { fetchTechCabalNews } = require('./sources/tech-cabal');
const { fetchMyBroadbandNews } = require('./sources/mybroadband-za');
const {
  fetchMENManUnitedFCNews,
} = require('./sources/manchester-evening-manutd');
const {
  fetchMENManCityFCNews,
} = require('./sources/manchester-evening-mancity');
const {
  fetchMENBusinessNews,
} = require('./sources/manchester-evening-business');
const {
  fetchManchesterEveningNews,
} = require('./sources/manchester-evening-world');
const {
  fetchGuardianUKEnvironmentNews,
} = require('./sources/guardian-uk-environment');
const {
  fetchGuardianUKBusinessNews,
} = require('./sources/guardian-uk-business');
const {
  fetchIndependentFootballNews,
} = require('./sources/independent-uk-football');
const {
  fetchIndependentBusinessNews,
} = require('./sources/independent-uk-business');
const {
  fetchBBCEntertainmentArtsNews,
} = require('./sources/bbc-entertainment');
const { fetchGhanaWebLeadStory } = require('./sources/ghanaweb-topstory');
const { fetchGhanaWebBusinessNews } = require('./sources/ghanaweb-business');
const { fetchGhanaWebSportsNews } = require('./sources/ghanaweb-sports');
const { fetchGhanaWebGeneralNews } = require('./sources/ghanaweb-news');
const { fetchCitiNewsroomGeneralNews } = require('./sources/citinewsroom-news');
const { fetchMyJoyOnlineNews } = require('./sources/myjoyonline-news');
const { fetchMyJoyOnlineSports } = require('./sources/myjoyonline-sports');
const { fetchMyJoyOnlineBusiness } = require('./sources/myjoyonline-business');
const { fetch3NewsPolitics } = require('./sources/3news-politics');
const { fetch3NewsBusiness } = require('./sources/3news-business');
const { fetch3NewsShowbiz } = require('./sources/3news-entertainment');
const { fetch3NewsSports } = require('./sources/3news-sports');
const { fetchGraphicNews } = require('./sources/graphic-online');
const { fetchGraphicSportsArticles } = require('./sources/graphic-sports');
const { fetchGraphicPoliticsArticles } = require('./sources/graphic-politics');
const { fetchGraphicBusinessArticles } = require('./sources/graphic-business');
const { fetchYawaSportsArticles } = require('./sources/yawa-news-sports');
const { fetchYawaNewsArticles } = require('./sources/yawa-news');
const { fetchGNASportsArticles } = require('./sources/gna-sports');
const { fetchGNAEconomyArticles } = require('./sources/gna-economy');
const { fetchGNAPoliticsArticles } = require('./sources/gna-politics');
const { fetchGNASocialArticles } = require('./sources/gna-social');
const { fetchGNAScienceArticles } = require('./sources/gna-science');
const { fetchGhanaianTimesAfrica } = require('./sources/ghanaian-times-africa');
const { fetchGhanaianTimesCrime } = require('./sources/ghanaian-times-crime');
const { fetchGhanaianTimesSport } = require('./sources/ghanaian-times-sports');
const { fetchGhanaianTimesNews } = require('./sources/ghanaian-times-news');
const { fetchModernGhanaSports } = require('./sources/modern-ghana-sports');
const {
  fetchGhanaianTimesBusiness,
} = require('./sources/ghanaian-times-business');
const {
  fetchGhanaianTimesPolitics,
} = require('./sources/ghanaian-times-politics');
const {
  fetchGNAEntertainmentArticles,
} = require('./sources/gna-entertainment');
const {
  fetchGhanaCelebritiesPoliticsArticles,
} = require('./sources/ghana-celebrities-politics');
const {
  fetchGhanaCelebritiesSportsArticles,
} = require('./sources/ghana-celebrities-sports');
const {
  fetchGhanaCelebritiesArticles,
} = require('./sources/ghana-celebrities-entertainment');
const {
  fetchYawaShowbizArticles,
} = require('./sources/yawa-news-entertainment');
const {
  fetchGraphicEntertainmentArticles,
} = require('./sources/graphic-entertainment');
const {
  fetchMyJoyOnlineArtsCulture,
} = require('./sources/myjoyonline-entertainment');
const {
  fetchGhanaWebEntertainmentNews,
} = require('./sources/ghanaweb-entertainment');
const { fetchTheHeraldGhanaNews } = require('./sources/herald-ghana');
const {
  fetchTheHeraldGhanaEntertainment,
} = require('./sources/herald-ghana-entertainment');
const {
  fetchTheHeraldGhanaBusiness,
} = require('./sources/herald-ghana-business');
const {
  fetchTheHeraldGhanaPolitics,
} = require('./sources/herald-ghana-politics');
const {
  fetchTheHeraldGhanaEditorial,
} = require('./sources/herald-ghana-editorial');
const { fetchTheHeraldGhanaSports } = require('./sources/herald-ghana-sports');
const { fetchTheHeraldGhanaHealth } = require('./sources/herald-ghana-health');
const {
  fetchThePublisherOnlineLatestNews,
} = require('./sources/publisher-topstories');
const { fetchThePublisherOnlineNews } = require('./sources/publisher-business');
const {
  fetchThePublisherOnlineNewss,
} = require('./sources/publisher-topbusiness');
const {
  fetchThePublisherOnlinePolitics,
} = require('./sources/publisher-politics');
const { fetchThePublisherOnlineSports } = require('./sources/publisher-sports');
const {
  fetchThePublisherOnlineCategory,
} = require('./sources/publisher-tophealth');
const { fetchAdomonlineNews } = require('./sources/adom-online-news');
const { fetchAdomonlinePolitics } = require('./sources/adom-online-politics');
const { fetchAdomonlineBusiness } = require('./sources/adom-online-business');
const {
  fetchAdomonlineEntertainment,
} = require('./sources/adom-online-entertainment');
const { fetchAdomonlineSports } = require('./sources/adom-online-sports');
const {
  fetchBusinessGhanaGeneralNews,
} = require('./sources/business-ghana-news');
const { fetchBusinessGhaNews } = require('./sources/business-ghana-business');
const {
  fetchBusinessGhanaSportsNews,
} = require('./sources/business-ghana-sports');
const {
  fetchBusinessGhanaPoliticsNews,
} = require('./sources/business-ghana-politics');
const {
  fetchBusinessGhanaEntertainmentNews,
} = require('./sources/business-ghana-entertainment');
const { fetchBusinessGhanaTechNews } = require('./sources/business-ghana-tech');
const { fetchNewsGhanaArticles } = require('./sources/news-ghana');
const { fetchNewsGhanaBusinessNews } = require('./sources/news-ghana-business');
const { fetchNewsGhanaSportsNews } = require('./sources/news-ghana-sports');
const {
  fetchNewsGhanaEntertainmentNews,
} = require('./sources/news-ghana-entertainment');
const { fetchNewsGhanaHealthNews } = require('./sources/news-ghana-health');
const { fetchNewsGhanaSciTechNews } = require('./sources/news-ghana-tech');
const { fetchNewsGhanaTravelNews } = require('./sources/news-ghana-travel');
const { fetchNewsGhanaWorldNews } = require('./sources/news-ghana-world');
const {
  fetchNewsGhanaRealEstateNews,
} = require('./sources/news-ghana-realestate');
const { fetchNewsGhanaAutoNews } = require('./sources/news-ghana-auto');
const { fetchYenEntertainmentNews } = require('./sources/yen-gh-entertainment');
const { fetchYenGhanaNews } = require('./sources/yen-gh');
const { fetchYenGhanaPoliticsNews } = require('./sources/yen-gh-politics');
const { fetchYenGhanaSportsNews } = require('./sources/yen-gh-sports');
const { fetchYenGhanaBusinessNews } = require('./sources/yen-gh-business');
const { fetchYenGhanaRealEstateNews } = require('./sources/yen-gh-realestate');
const {
  fetchDailyGuideBusinessNews,
} = require('./sources/daily-guide-network-business');
const {
  fetchDailyGuidePoliticalNews,
} = require('./sources/daily-guide-network-politics');
const {
  fetchDailyGuideEntertainmentNews,
} = require('./sources/daily-guide-network-entertainment');
const {
  fetchDailyGuideSportsNews,
} = require('./sources/daily-guide-network-sports');
const {
  fetchDailyGuideGeneralNews,
} = require('./sources/daily-guide-network-news');
const {
  fetchDailyGuideHealthNews,
} = require('./sources/daily-guide-network-health');
const {
  fetchBFTEconomyNews,
} = require('./sources/business-and-financial-times-economy');
const {
  fetchBFTBusinessNews,
} = require('./sources/business-and-financial-times-business');

const newsSources = [
  fetchBuzzfeedHealthNews,
  fetchBuzzfeedPoliticsNews,
  fetchEconomistFinanceNews,
  fetchFinancialTimesAfricaNews,
  fetchFinancialTimesGlobalEconomyNews,
  fetchFinancialTimesWorldNews,
  fetchGlamourHealthNews,
  fetchGuardianHealthNews,
  fetchGuardianWellbeingNews,
  fetchLATimesWorldNews,
  fetchLifeHackerHealthNews,
  fetchNBCNewsGeneralNews,
  fetchNewScientistHealthNews,
  fetchNewYorkTimesAfricaNews,
  fetchNewYorkTimesBusinessNews,
  fetchNewYorkTimesSoccerNews,
  fetchNewYorkTimesTechNews,
  fetchNewYorkTimesWorldNews,
  fetchNPRGeneralNews,
  fetchTimeHealthNews,
  fetchWallStreetJournalMarketsNews,
  fetchWallStreetJournalTechNews,
  fetchWallStreetJournalUSBusinessNews,
  fetchWallStreetJournalWorldNews,
  fetchYahooHealthNews,
  fetchYahooWorldNews,
  fetchBBCSportFootballNews,
  fetchBBCNews,
  fetchBBCWorldNews,
  fetchBBCBusinessNews,
  fetchBBCPoliticsNews,
  fetchBBCScienceEnvironmentNews,
  fetchBBCTechnologyNews,
  fetchBBCEntertainmentArtsNews,
  fetchSkyNewsWorld,
  fetchSkyNewsBusiness,
  fetchSkyNewsPolitics,
  fetchSkyNewsTechnology,
  fetchFrance24News,
  fetchFrance24Africa,
  fetchFrance24Business,
  fetchFrance24Sports,
  fetchFrance24Earth,
  fetchFrance24Culture,
  fetchDWWorldNews,
  fetchDWBusinessNews,
  fetchDWTopStories,
  fetchDWSports,
  fetchDWCulture,
  fetchDWScience,
  fetchRTNews,
  fetchRTRussia,
  fetchRTBusiness,
  fetchIndependentWorldNews,
  fetchIndependentBusinessNews,
  fetchIndependentFootballNews,
  fetchGuardianFootballNews,
  fetchGuardianUKBusinessNews,
  fetchGuardianScienceNews,
  fetchGuardianUKSportNews,
  fetchGuardianUKEnvironmentNews,
  fetchManchesterEveningNews,
  fetchMENSportNews,
  fetchMENBusinessNews,
  fetchMENManCityFCNews,
  fetchMENManUnitedFCNews,
  fetchMyLondonNews,
  fetchMyLondonSportNews,
  fetchDailyMailNews,
  fetchDailyMailSciTechNews,
  fetchDailyMailTravelNews,
  fetchDailyMailSportNews,
  fetchScotsmanNews,
  fetchDailyRecordNews,
  fetchChannel4News,
  fetchEveningStandardNews,
  fetchHeraldScotlandNews,
  fetchHuffPostUKNews,
  fetchMetroNews,
  fetchExpressWorldNews,
  fetchExpressScienceNews,
  fetchExpressFootballNews,
  fetchExpressAfricaNews,
  fetchExpressAsiaNews,
  fetchAJPlusNews,
  fetchAJAMNews,
  fetchMiddleEastMonitorNews,
  fetchMiddleEastEyeNews,
  fetchCGTNChinaNews,
  fetchCGTNWorldNews,
  fetchCGTNBusinessNews,
  fetchCGTNTechSciNews,
  fetchCGTNTravelNews,
  fetchChinaDailyChinaNews,
  fetchChinaDailyBizChinaNews,
  fetchChinaDailyWorldNews,
  fetchSCMPNews,
  fetchSCMPAfricaNews,
  fetchSCMPChinaNews,
  fetchSCMPAsiaNews,
  fetchSCMPPoliticsNews,
  fetchXinhuaWorldNews,
  fetchXinhuaBusinessNews,
  fetchCNETNews,
  fetchMashableNews,
  fetchTechCrunchNews,
  fetchTheNextWebNews,
  fetchTheVergeNews,
  fetchTechRadarNews,
  fetchTechRadarNews,
  fetchPCWorldNews,
  fetchEngadgetNews,
  fetchAndroidAuthorityNews,
  fetchArsTechnicaTechLab,
  fetchAndroidCentralNews,
  fetchGSMArenaNews,
  fetch9to5MacNews,
  fetchAppleNewsroom,
  fetchAppleInsiderNews,
  fetchIMoreNews,
  fetchSamsungGlobalNews,
  fetchWindowsCentralNews,
  fetchGreatGoalsNews,
  fetchTalkChelseaNews,
  fetchThisIsAnfieldNews,
  fetchArseblogNews,
  fetchEmpireOfTheKopNews,
  fetchRomaPressNews,
  fetchCaughtOffsideNews,
  fetchTheMagNews,
  fetchNUFCBlogNews,
  fetchBarcaUniversalNews,
  fetchStarsAndStripesFCNews,
  fetchTheKopTimesNews,
  fetchToffeeWebNews,
  fetchSBISoccerNews,
  fetchSixSportsNews,
  fetchRealMadridNews,
  fetchBundesligaFanNews,
  fetchJuveFCNews,
  fetchFrenchFootballWeeklyNews,
  fetchEyeFootballNews,
  fetchMarcaEnglishNews,
  fetch90MinNews,
  fetchManUtdNews,
  fetchFootballItaliaNews,
  fetchGhanaSoccernetNews,
  fetchCultOfCalcioNews,
  fetchSaharaFootballNews,
  fetchNFFNews,
  fetchGermanFootballNews,
  fetchLaLigaBlogNews,
  fetchChannelsTVNews,
  fetchFootballEspanaNews,
  fetchLaLigaExpertNews,
  fetchSportEsNews,
  fetchManagingMadridNews,
  fetchIntoTheCalderonNews,
  fetchBarcaBlaugranesNews,
  fetchSportsMoleBarcelonaNews,
  fetchLaLigaNews,
  fetchGuardianBarcelonaNews,
  fetchRCCeltaNews,
  fetchESPNNews,
  fetchESPNBoxingNews,
  fetchESPNSoccerNews,
  fetchESPNNBANews,
  fetchYahooSportsNews,
  fetchCBSSportsNews,
  fetchSkySportsPremierLeagueNews,
  fetchTechRadar,
  fetchVanguardNews,
  fetchGuardianNgNews,
  fetchPremiumTimesNews,
  fetchPMNews,
  fetchDailyPostNews,
  fetchConverseerNews,
  fetchTheBureauNews,
  fetchIndependentNGNews,
  fetchToriNGNews,
  fetchLeadershipNGNews,
  fetchRipplesNGNews,
  fetchDailyNigerianNews,
  fetchNigerianEyeNews,
  fetchAfricanExaminerNews,
  fetchIOLNews,
  fetchMailGuardianNews,
  fetchDailyMaverickNews,
  fetchSowetanLiveNews,
  fetchCitizenNews,
  fetchMyBroadbandNews,
  fetchTheSouthAfricanNews,
  fetchTechCentralNews,
  fetchAfricanInsiderNews,
  fetchAfricanEntertainmentNews,
  fetchAfricaIntelligenceNews,
  fetchBellaNaijaNews,
  fetchTechCabalNews,
  fetchAfricanMirrorNews,
  fetchITNewsAfrica,
  fetchAfricaNews,
  fetchConstructAfricaNews,
  fetchAmeyawDebrahNews,
  fetchGhanaianChronicleNews,
  fetchAccraMailNews,
  fetchGhanaWebLeadStory,
  fetchGhanaWebBusinessNews,
  fetchGhanaWebSportsNews,
  fetchGhanaWebGeneralNews,
  fetchGhanaWebEntertainmentNews,
  fetchCitiNewsroomGeneralNews,
  fetchMyJoyOnlineNews,
  fetchMyJoyOnlineSports,
  fetchMyJoyOnlineArtsCulture,
  fetchMyJoyOnlineBusiness,
  fetch3NewsPolitics,
  fetch3NewsBusiness,
  fetch3NewsShowbiz,
  fetch3NewsSports,
  fetchGraphicNews,
  fetchGraphicSportsArticles,
  fetchGraphicEntertainmentArticles,
  fetchGraphicPoliticsArticles,
  fetchGraphicBusinessArticles,
  fetchYawaSportsArticles,
  fetchYawaNewsArticles,
  fetchYawaShowbizArticles,
  fetchGhanaCelebritiesArticles,
  fetchGhanaCelebritiesPoliticsArticles,
  fetchGhanaCelebritiesSportsArticles,
  fetchGNASportsArticles,
  fetchGNAEntertainmentArticles,
  fetchGNAEconomyArticles,
  fetchGNAPoliticsArticles,
  fetchGNASocialArticles,
  fetchGNAScienceArticles,
  fetchGhanaianTimesPolitics,
  fetchGhanaianTimesBusiness,
  fetchGhanaianTimesAfrica,
  fetchGhanaianTimesCrime,
  fetchGhanaianTimesSport,
  fetchGhanaianTimesNews,
  fetchModernGhanaSports,
  fetchTheHeraldGhanaNews,
  fetchTheHeraldGhanaEntertainment,
  fetchTheHeraldGhanaBusiness,
  fetchTheHeraldGhanaPolitics,
  fetchTheHeraldGhanaEditorial,
  fetchTheHeraldGhanaSports,
  fetchTheHeraldGhanaHealth,
  fetchThePublisherOnlineLatestNews,
  fetchThePublisherOnlineNews,
  fetchThePublisherOnlineNewss,
  fetchThePublisherOnlinePolitics,
  fetchThePublisherOnlineSports,
  fetchThePublisherOnlineCategory,
  fetchAdomonlineNews,
  fetchAdomonlinePolitics,
  fetchAdomonlineBusiness,
  fetchAdomonlineEntertainment,
  fetchAdomonlineSports,
  fetchBusinessGhanaGeneralNews,
  fetchBusinessGhaNews,
  fetchBusinessGhanaSportsNews,
  fetchBusinessGhanaPoliticsNews,
  fetchBusinessGhanaEntertainmentNews,
  fetchBusinessGhanaTechNews,
  fetchNewsGhanaArticles,
  fetchNewsGhanaBusinessNews,
  fetchNewsGhanaSportsNews,
  fetchNewsGhanaEntertainmentNews,
  fetchNewsGhanaHealthNews,
  fetchNewsGhanaSciTechNews,
  fetchNewsGhanaTravelNews,
  fetchNewsGhanaWorldNews,
  fetchNewsGhanaRealEstateNews,
  fetchNewsGhanaAutoNews,
  fetchYenEntertainmentNews,
  fetchYenGhanaNews,
  fetchYenGhanaPoliticsNews,
  fetchYenGhanaSportsNews,
  fetchYenGhanaBusinessNews,
  fetchYenGhanaRealEstateNews,
  fetchDailyGuideBusinessNews,
  fetchDailyGuidePoliticalNews,
  fetchDailyGuideEntertainmentNews,
  fetchDailyGuideSportsNews,
  fetchDailyGuideGeneralNews,
  fetchDailyGuideHealthNews,
  fetchBFTEconomyNews,
  fetchBFTBusinessNews,
];

module.exports = newsSources;
