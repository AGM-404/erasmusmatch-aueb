const commonsImagesByCity = {
  Vienna: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Vienna_Skyline_%28cropped%29.jpg/1280px-Vienna_Skyline_%28cropped%29.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Vienna_Skyline_(cropped).jpg',
    creator: 'Fabian Lackner',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  Paris: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Skyline_in_Paris%2C_12_July_2017.jpg/1280px-Skyline_in_Paris%2C_12_July_2017.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Skyline_in_Paris,_12_July_2017.jpg',
    creator: 'Christer Gundersen',
    license: 'CC BY 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
  Berlin: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Berlin_TV_tower_city_skyline_%2841610209475%29.jpg/1280px-Berlin_TV_tower_city_skyline_%2841610209475%29.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Berlin_TV_tower_city_skyline_(41610209475).jpg',
    creator: 'Markus Spiske',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  Trier: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Trier_Dom_und_Liebfrauen_BW_2019-08-31_13-21-08.jpg/1280px-Trier_Dom_und_Liebfrauen_BW_2019-08-31_13-21-08.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Trier_Dom_und_Liebfrauen_BW_2019-08-31_13-21-08.jpg',
    creator: 'Berthold Werner',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  Dortmund: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Dortmund_City_Panorama.jpg/1280px-Dortmund_City_Panorama.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Dortmund_City_Panorama.jpg',
    creator: 'DerMische',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  Ghent: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Statue_Ghent-City-Hall.jpg/1280px-Statue_Ghent-City-Hall.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Statue_Ghent-City-Hall.jpg',
    creator: 'Acediscovery',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  Bratislava: {
    src: '/partner-universities/comenius-bratislava.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:%C5%A0af%C3%A1rikovo_n%C3%A1mestie_(%C5%A0af%C3%A1rikovo_Square)_and_Univerzita_Komensk%C3%A9ho_(Comenius_University)_in_Bratislava,_Slovak_Republic.JPG',
    creator: 'Kiwiev',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  'Banská Bystrica': {
    src: '/partner-universities/matej-bel-banska-bystrica.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Banska-Bystrica-Matej-Bel-University-rectorate.jpg',
    creator: 'Vassia Atanassova - Spiritia',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  Sofia: {
    src: '/partner-universities/sofia-university.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Sofia_University_%22St._Kliment_Ohridski%22_(37849719131).jpg',
    creator: 'Deensel',
    license: 'Public domain',
    licenseUrl: '',
  },
  Riga: {
    src: '/partner-universities/university-of-latvia-riga.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Latvijas_Universit%C4%81tes_centr%C4%81l%C4%81_%C4%93ka.JPG',
    creator: 'Evita wiki',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  Prague: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Prague_skyline_view.jpg/1280px-Prague_skyline_view.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Prague_skyline_view.jpg',
    creator: 'MurderousPass',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  Barcelona: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Barcelona_city_view.jpg/1280px-Barcelona_city_view.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Barcelona_city_view.jpg',
    creator: 'Ivan Mlinaric',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  Groningen: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Groningen_skyline.jpg/1280px-Groningen_skyline.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Groningen_skyline.jpg',
    creator: 'Laurensvanheerde',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'The Hague': {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/The_Hague%2C_skyline_of_the_city_center.png/1280px-The_Hague%2C_skyline_of_the_city_center.png',
    source: 'https://commons.wikimedia.org/wiki/File:The_Hague,_skyline_of_the_city_center.png',
    creator: 'OSeveno',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  Nijmegen: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c6/Skyline_Nijmegen_vanaf_Stadsbrug_de_Oversteek.jpg/1280px-Skyline_Nijmegen_vanaf_Stadsbrug_de_Oversteek.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Skyline_Nijmegen_vanaf_Stadsbrug_de_Oversteek.jpg',
    creator: 'Roger Veringmeier',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  Tilburg: {
    src: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Skyline_Tilburg_2017.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Skyline_Tilburg_2017.jpg',
    creator: 'Freddie de Roeck',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  Enschede: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/Enschede%2C_binnenstad.jpg/1280px-Enschede%2C_binnenstad.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Enschede,_binnenstad.jpg',
    creator: 'Kleuske',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  Warsaw: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/Warsaw_2023_039_Palace_Cathedral_Skyline.jpg/1280px-Warsaw_2023_039_Palace_Cathedral_Skyline.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Warsaw_2023_039_Palace_Cathedral_Skyline.jpg',
    creator: 'Scotch Mist',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  Helsinki: {
    src: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Helsinki_Skyline_%2852432702085%29.jpg/1280px-Helsinki_Skyline_%2852432702085%29.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Helsinki_Skyline_(52432702085).jpg',
    creator: 'William John Gauthier',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
  },
}

export function getPartnerCityImage(city) {
  return commonsImagesByCity[city] ?? null
}

export function getPartnerCityImageCities() {
  return Object.keys(commonsImagesByCity)
}
