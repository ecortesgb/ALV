const grupo = (perfil, ids) => Object.fromEntries(ids.trim().split(/\s+/).map(id => [id, perfil]));
export const PERFIL_PERSONAJE = {
    // Firmes y seguros: líderes y soldados.
    ...grupo("heroico", `capitan-america capitan-america-clasico capitan-britania thor jane-foster superman mujer-maravilla
    aquaman batman batman-returns ciclope falcon war-machine iron-patriot black-panther nick-fury maria-hill coulson
    hawkeye heimdall odin sif nova luke-skywalker anakin-skywalker mandaloriano jango-fett union-jack moon-knight
    daredevil iron-fist punisher blade silver-surfer profesor-x harry-potter`),
    // Inquietos y contentos.
    ...grupo("alegre", `spider-man iron-spider superior-spider-man spider-woman ms-marvel chica-ardilla flash robin
    robin-lego-batman antorcha-humana iceman ant-man avispa star-lord peter-parker gwen-stacy mary-jane rescue
    hermione-granger ron-weasley stan-lee tia-may coloso fenix jean-grey groot`),
    // Exagerados y bromistas.
    ...grupo("comico", `deadpool howard-el-pato rocket joker joker-caballero-oscuro mysterio sapo arnim-zola modok
    duende-verde duende-verde-ultimate gambito drax yoda hombre-absorbente shocker`),
    // Tensos, presumen fuerza.
    ...grupo("agresivo", `hulk hulk-rojo abominacion la-mole wolverine dientes-de-sable venom venom-grande carnage
    juggernaut thanos rino lagarto kraven craneo-rojo darth-maul ghost-rider spider-man-negro bullseye taskmaster
    super-skrull ronan malekith hulkbuster el-lider kingpin buitre whiplash electro hombre-de-arena
    soldado-del-invierno she-hulk elektra pyro havok`),
    // Pocos gestos, con estilo.
    ...grupo("elegante", `iron-man iron-man-clasico iron-man-mk42 tony-stark doctor-strange black-widow emma-frost
    magneto loki darth-vader voldemort mistica psylocke gata-negra mujer-invisible mr-fantastico tormenta polaris
    fenix-oscura doctor-doom mandarin gamora viper pepper-potts bruce-wayne arcangel bestia doctor-octopus`),
    // Reservados.
    ...grupo("timido", `bruce-banner`),
};
