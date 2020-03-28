<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format">
<xsl:output method="html" indent="no"/>
<xsl:strip-space elements="*"/>
	<!--MENU-->
	<xsl:template match="MENU" mode="top">
		<xsl:apply-templates select="MENU-ITEM"  mode="top"/>
	</xsl:template>

	<!--MENU-ITEM-->
	<xsl:template match="MENU-ITEM"  mode="top">
   		<xsl:choose>
           <!-- active menu with link-->
           	<xsl:when test="MENU-ITEM[@ID=/LAYOUT/@ID] or @ID=/LAYOUT/@ID">

<tr>
<td width="5"></td>
<td ><a href="{@HREF}" class="tmenua"><xsl:value-of select="@TITLE" disable-output-escaping="yes"/></a> </td>
<td class="t1"><img src="images/bullet.gif"/></td>
</tr>
            </xsl:when>
            
            
            <xsl:otherwise>
<tr>
<td width="5"></td>
<td ><a href="{@HREF}" class="tmenu"><xsl:value-of select="@TITLE" disable-output-escaping="yes"/></a> </td>
<td class="t1"><img src="images/bullet.gif"/></td>
</tr>
            </xsl:otherwise>
	    </xsl:choose>
  		<xsl:if test="position()!=last()">
 <tr>
<td colspan="3"><img src="images/006.gif"/></td>
</tr>
  		</xsl:if>
	</xsl:template>	

</xsl:stylesheet>
