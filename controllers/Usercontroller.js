export function getstatisticspage(req, res) {
    res.render("statistics"); 
  };

  export function getmyprojectpage(req, res) {
    res.render("myprojects"); // Ensure 'myprojects.ejs' exists in /views
}

export function geteditprofilepage(req, res) {
    res.render("editprofile");
}



