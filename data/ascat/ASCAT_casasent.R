library(ASCAT)

print("Running aspcf...")

# P5
ascat.bc = ascat.loadData("/Users/gillianchu/mek/cnaviz/ascat/ascat_inputs/og_P5_ascat_log2r.txt", "/Users/gillianchu/mek/cnaviz/ascat/ascat_inputs/og_P5_ascat_baf.txt")
ascat.plotRawData(ascat.bc, img.dir="/Users/gillianchu/mek/cnaviz/ascat/ascat_plots", img.prefix='p5_rawdata')
gg<-ascat.predictGermlineGenotypes(ascat.bc, platform = "AffySNP6")
ascat.bc = ascat.aspcf(ascat.bc, ascat.gg=gg)
ascat.plotSegmentedData(ASCATobj=ascat.bc, img.dir="/Users/gillianchu/mek/cnaviz/ascat/ascat_plots", img.prefix='og_p5')
ascat.output = ascat.runAscat(ascat.bc, rho_manual=c(0.680271, 0.431884), psi_manual=c(4.178528, 3.346920))
write.csv(ascat.output$segments, "/Users/gillianchu/mek/cnaviz/ascat/ascat_outputs/og_P5_aspcf_nonorm_segments.csv", row.names=FALSE)
write.csv(ascat.bc$SNPpos, "/Users/gillianchu/mek/cnaviz/ascat/ascat_outputs/og_P5_aspcf_nonorm_snpdata.csv", row.names=FALSE)

# P6
ascat.bc = ascat.loadData("/Users/gillianchu/mek/cnaviz/ascat/ascat_inputs/og_P6_ascat_log2r.txt", "/Users/gillianchu/mek/cnaviz/ascat/ascat_inputs/og_P6_ascat_baf.txt")
ascat.plotRawData(ascat.bc, img.dir="/Users/gillianchu/mek/ascat/ascat_plots", img.prefix = "p6_rawdata")
gg<-ascat.predictGermlineGenotypes(ascat.bc, platform = "AffySNP6")
ascat.bc = ascat.aspcf(ascat.bc, ascat.gg=gg)
ascat.plotSegmentedData(ASCATobj=ascat.bc, img.dir='/Users/gillianchu/mek/ascat/ascat_plots', img.prefix='og_p6')
ascat.output = ascat.runAscat(ascat.bc, rho_manual=c(0.768595, 0.820807), psi_manual=c(1.599508, 1.445370))
write.csv(ascat.output$segments, "/Users/gillianchu/mek/cnaviz/ascat/ascat_outputs/og_P6_aspcf_nonorm_segments.csv", row.names=FALSE)
write.csv(ascat.bc$SNPpos, "/Users/gillianchu/mek/cnaviz/ascat/ascat_outputs/og_P6_aspcf_nonorm_snpdata.csv", row.names=FALSE)

# P10 
ascat.bc = ascat.loadData("/Users/gillianchu/mek/cnaviz/ascat/ascat_inputs/og_P10_ascat_log2r.txt", "/Users/gillianchu/mek/cnaviz/ascat/ascat_inputs/og_P10_ascat_baf.txt")
ascat.plotRawData(ascat.bc, img.dir="/Users/gillianchu/mek/ascat/ascat_plots", img.prefix = "p10_rawdata")
gg<-ascat.predictGermlineGenotypes(ascat.bc, platform = "AffySNP6")
ascat.bc = ascat.aspcf(ascat.bc, ascat.gg=gg)
ascat.plotSegmentedData(ASCATobj=ascat.bc, img.dir='/Users/gillianchu/mek/ascat/ascat_plots', img.prefix='og_p10')
ascat.output = ascat.runAscat(ascat.bc, rho_manual=c(0.961155, 0.844639), psi_manual=c(1.567808, 1.644032))
write.csv(ascat.output$segments, "/Users/gillianchu/mek/cnaviz/ascat/ascat_outputs/og_P10_aspcf_nonorm_segments.csv", row.names=FALSE)
write.csv(ascat.bc$SNPpos, "/Users/gillianchu/mek/cnaviz/ascat/ascat_outputs/og_P10_aspcf_nonorm_snpdata.csv", row.names=FALSE)

# SIMULATION - s4669
ascat.bc = ascat.loadData("/Users/gillianchu/mek/cnaviz/ascat/ascat_inputs/og_s4669_ascat_log2r.txt", "/Users/gillianchu/mek/cnaviz/ascat/ascat_inputs/og_s4669_ascat_baf.txt")
ascat.plotRawData(ascat.bc, img.dir="/Users/gillianchu/mek/cnaviz/ascat/ascat_plots", img.prefix='s4669_rawdata')
gg<-ascat.predictGermlineGenotypes(ascat.bc, platform = "AffySNP6")
ascat.bc = ascat.aspcf(ascat.bc, ascat.gg=gg)
ascat.plotSegmentedData(ASCATobj=ascat.bc, img.dir="/Users/gillianchu/mek/cnaviz/ascat/ascat_plots", img.prefix='og_s4669')
ascat.output = ascat.runAscat(ascat.bc, rho_manual=c(0.949758, 0.949751, 0.799842), psi_manual=c(1.971723, 1.951668, 1.923111))
write.csv(ascat.output$segments, "/Users/gillianchu/mek/cnaviz/ascat/ascat_outputs/og_s4669_aspcf_nonorm_segments.csv", row.names=FALSE)
write.csv(ascat.bc$SNPpos, "/Users/gillianchu/mek/cnaviz/ascat/ascat_outputs/og_s4669_aspcf_nonorm_snpdata.csv", row.names=FALSE)
