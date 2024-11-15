async function getYoutubeUrl(url){
  const videoInfo = await youtubedl(url, {
    dumpSingleJson: true,
    preferFreeFormats: true,
    addHeader: ["referer:youtube.com", "user-agent:googlebot"],
  });

  const audioUrl = videoInfo.formats.reverse().find(
    (format) => format.resolution === "audio only" && format.ext === "m4a",
  )?.url;

  if (!audioUrl) {
    throw new Error("No audio only format found");
  }
  console.log("Audio URL retrieved successfully");
  console.log("Audio URL:", audioUrl);
  return audioUrl

}

module.exports=getYoutubeUrl